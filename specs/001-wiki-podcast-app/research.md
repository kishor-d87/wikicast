# Research: Wikipedia Podcast Generator

**Feature**: 001-wiki-podcast-app  
**Date**: 2025-12-22  
**Status**: Complete

## Overview

This document captures technology decisions, best practices, and alternatives considered for implementing the Wikipedia Podcast Generator.

---

## 1. Wikipedia Content Extraction

### Decision
Use the **Wikipedia REST API** (Wikimedia REST API v1) for article fetching.

### Rationale
- Official, well-documented API with stable endpoints
- Supports fetching plain text extracts (no HTML parsing needed)
- Rate limits are generous for single-user MVP (200 req/sec for unauth)
- Handles redirects and disambiguation automatically with proper parameters

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Wikipedia Action API (MediaWiki) | More complex, returns wikitext requiring parsing |
| Web scraping | Fragile, violates terms of service, unnecessary |
| Third-party Wikipedia APIs | Adds dependency, potential for staleness |

### Implementation Notes
- Endpoint: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` for metadata
- Endpoint: `https://en.wikipedia.org/api/rest_v1/page/html/{title}` for full content
- Use `textextracts` prop for clean plaintext in Action API fallback
- Handle article titles with special characters via URL encoding

---

## 2. AI Script Generation (xAI Grok)

### Decision
Use **xAI Grok API** with the `grok-beta` model, temperature=0, single-pass generation.

### Rationale
- Constitution requires deterministic, template-based AI behavior
- Grok supports system prompts and temperature control
- Single model call avoids prompt chaining complexity
- Low temperature (0) maximizes reproducibility

### Configuration
```typescript
{
  model: "grok-beta",
  temperature: 0,
  max_tokens: 4096,
  top_p: 1,
  // No streaming - wait for complete response
}
```

### Prompt Strategy
- **System prompt**: Defines Alex/Jordan personas, podcast structure rules, content integrity constraints
- **User prompt**: Article content (cleaned) + generation instructions
- **Output format**: JSON with speaker-attributed lines

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| OpenAI GPT-4 | User specified xAI Grok |
| Claude | User specified xAI Grok |
| Multi-pass refinement | Constitution prohibits recursive self-improvement |
| Higher temperature | Reduces determinism, violates constitution |

---

## 3. Text-to-Speech (ElevenLabs)

### Decision
Use **ElevenLabs API** with two fixed voice IDs for Alex and Jordan.

### Rationale
- High-quality, natural-sounding voices
- Consistent voice IDs ensure predictable speaker mapping
- Streaming support available but not needed for MVP
- MP3 output format supported natively

### Voice Mapping
```typescript
const VOICE_MAP = {
  "Alex": "21m00Tcm4TlvDq8ikWAM",    // Rachel (female, conversational)
  "Jordan": "AZnzlk1XvdvUeBnXmlld"   // Domi (male, conversational)
} as const;
```

### Configuration
```typescript
{
  model_id: "eleven_monolingual_v1",
  voice_settings: {
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true
  },
  output_format: "mp3_44100_128"  // High quality MP3
}
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Google Cloud TTS | Less natural conversational voices |
| Amazon Polly | Less natural conversational voices |
| Azure Speech | More complex setup, similar quality |
| OpenAI TTS | User specified ElevenLabs |

---

## 4. Audio Processing (FFmpeg)

### Decision
Use **FFmpeg** via `fluent-ffmpeg` Node.js wrapper for audio stitching and normalization.

### Rationale
- Industry standard for audio processing
- Handles concatenation, normalization, format conversion
- Available as Alpine package for Docker container
- No additional cloud dependencies

### Operations Required
1. **Concatenate**: Join individual speaker segments in order
2. **Normalize**: Apply loudnorm filter for consistent volume
3. **Output**: MP3 format, 128kbps, 44.1kHz

### FFmpeg Command Pattern
```bash
ffmpeg -i "concat:seg1.mp3|seg2.mp3|..." \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -codec:a libmp3lame -b:a 128k \
  output.mp3
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| sox | Less feature-rich, fewer format options |
| Web Audio API (browser) | Processing should be server-side |
| Cloud audio services | Adds external dependency, cost |

---

## 5. Frontend Architecture

### Decision
**React 18 + Vite + Tailwind CSS** single-page application.

### Rationale
- User specified tech stack
- Vite provides fast development iteration
- Tailwind enables rapid UI development
- React 18 features (Suspense, transitions) improve UX

### State Management
- Use React `useState` + `useReducer` for generation state
- No external state library needed (simple flow)
- SSE or polling for progress updates

### Key Components
1. `InputForm` - URL/title input with validation
2. `ProgressTracker` - Stage-based progress display
3. `AudioPlayer` - HTML5 audio with controls
4. `DownloadButton` - Blob download trigger

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Next.js | Over-engineered for single-page SPA |
| Vue/Svelte | User specified React |
| Redux | Unnecessary complexity for simple state |
| CSS Modules | Tailwind preferred per user spec |

---

## 6. Backend Architecture

### Decision
**Express.js** REST API with TypeScript, single endpoint design.

### Rationale
- Lightweight, well-understood framework
- TypeScript provides type safety
- Single `/api/podcast` endpoint simplifies architecture
- No authentication needed per constraints

### API Design
- `POST /api/podcast` - Generate podcast (accepts URL or title)
- `GET /api/podcast/:id/status` - Poll generation status
- `GET /api/podcast/:id/audio` - Download generated MP3
- Server-Sent Events for real-time progress (optional enhancement)

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Fastify | Express more widely known, sufficient for MVP |
| NestJS | Over-engineered for simple API |
| tRPC | Adds complexity, REST sufficient |
| GraphQL | Single resource, REST simpler |

---

## 7. Docker Deployment

### Decision
**Multi-stage Dockerfile** building both frontend and backend into single container.

### Rationale
- User requires single container deployment (FR-024)
- Multi-stage reduces image size
- Backend serves frontend static files in production
- FFmpeg installed from Alpine packages

### Dockerfile Strategy
```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
...

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
...

# Stage 3: Production
FROM node:20-alpine AS production
RUN apk add --no-cache ffmpeg
COPY --from=frontend-build /app/dist ./public
COPY --from=backend-build /app/dist ./
...
```

### Environment Variables
```bash
XAI_API_KEY=          # xAI Grok API key
ELEVENLABS_API_KEY=   # ElevenLabs API key
PORT=3000             # Server port (default: 3000)
OUTPUT_DIR=/app/output # Generated files directory
```

---

## 8. Error Handling Strategy

### Decision
Implement **graceful degradation** with clear user feedback.

### Error Categories

| Category | Handling |
|----------|----------|
| Invalid input | Validate before processing, return specific error |
| Wikipedia unavailable | Retry once, then show "Wikipedia temporarily unavailable" |
| AI generation failure | Retry once with same prompt, then show error |
| TTS failure | Retry failed segment, then show partial generation option |
| FFmpeg failure | Log details, show "Audio processing failed" |

### User-Facing Errors
- Always human-readable, actionable messages
- Never expose internal errors or stack traces
- Provide retry option where appropriate

---

## 9. File Naming Convention

### Decision
**Deterministic file naming** based on article title and timestamp.

### Pattern
```
{sanitized_title}_{timestamp}.{ext}

Examples:
- albert_einstein_20251222_143052.json  (script)
- albert_einstein_20251222_143052.mp3   (audio)
- albert_einstein_20251222_143052.meta  (metadata)
```

### Sanitization Rules
- Lowercase
- Replace spaces with underscores
- Remove special characters except hyphens
- Truncate to 50 characters

---

## 10. Testing Strategy

### Decision
**Three-tier testing** with Vitest (unit), Jest (integration), Playwright (E2E).

### Coverage Targets

| Layer | Tools | Focus |
|-------|-------|-------|
| Unit | Vitest/Jest | Prompt template, validation, file naming |
| Integration | Jest + mocks | Wikipedia fetch, Grok call, ElevenLabs call |
| E2E | Playwright | Full generation flow in browser |
| Contract | Jest | API response shapes |

### Constitution Compliance Tests
- Verify script contains only Alex/Jordan speakers
- Verify script has all 5 required sections
- Verify no external facts in output (sample validation)
- Verify deterministic output for same input (statistical)

---

## Summary of Decisions

| Area | Technology | Confidence |
|------|------------|------------|
| Wikipedia API | Wikimedia REST v1 | High |
| AI Generation | xAI Grok (grok-beta, temp=0) | High |
| TTS | ElevenLabs (fixed voices) | High |
| Audio Processing | FFmpeg via fluent-ffmpeg | High |
| Frontend | React 18 + Vite + Tailwind | High |
| Backend | Express.js + TypeScript | High |
| Deployment | Single Docker container | High |
| Testing | Vitest + Jest + Playwright | High |

All decisions align with constitution principles and user requirements. No NEEDS CLARIFICATION items remain.

