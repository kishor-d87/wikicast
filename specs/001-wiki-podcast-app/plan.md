# Implementation Plan: Wikipedia Podcast Generator

**Branch**: `001-wiki-podcast-app` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-wiki-podcast-app/spec.md`

## Summary

Build a Dockerized web application that converts Wikipedia articles into 2-3 minute conversational audio podcasts featuring two AI hosts (Alex and Jordan). The system fetches article content via Wikipedia REST API, generates a structured conversational script using xAI Grok with deterministic settings, synthesizes multi-voice audio via ElevenLabs TTS, and stitches audio segments using FFmpeg. Users interact through a React single-page application with real-time progress indicators, in-browser playback, and MP3 download capability.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS for backend, ES2022 target for frontend)  
**Primary Dependencies**:
- Frontend: React 18, Vite, Tailwind CSS
- Backend: Express.js, node-fetch
- AI: xAI Grok API (grok-beta model)
- TTS: ElevenLabs API
- Audio: FFmpeg (via fluent-ffmpeg)

**Storage**: Local filesystem only (no database per FR-026, FR-027)  
**Testing**: Vitest (frontend), Jest (backend), Playwright (E2E)  
**Target Platform**: Docker container (Linux-based), accessible via web browser  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- End-to-end generation < 2 minutes (SC-001)
- Container startup < 30 seconds (SC-007)
- Audio duration 120-180 seconds (SC-002)

**Constraints**:
- Single container deployment (FR-024)
- No database (FR-026)
- No authentication (per user requirements)
- Deterministic AI output (FR-021, FR-022, FR-023)
- API keys via environment variables (FR-025)

**Scale/Scope**: Single user at a time (MVP assumption), single-page interface

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Implementation | Status |
|-----------|-------------|----------------|--------|
| **I. Content Integrity** | Facts from source only | Prompt template instructs Grok to use only article content; no external search | ✅ Pass |
| **II. Structural Consistency** | 5-section podcast structure | Prompt template enforces: greeting, explanation, clarification, Q&A, sign-off | ✅ Pass |
| **III. Speaker Discipline** | Exactly Alex & Jordan | Prompt template specifies two speakers; parser validates attribution | ✅ Pass |
| **IV. Audio Predictability** | Same input → same output | Fixed temperature=0, deterministic voice mapping, consistent file naming | ✅ Pass |
| **V. Deterministic AI Behavior** | Template-based prompts, low temperature | Single prompt template, temperature=0, no chaining | ✅ Pass |
| **VI. Observable Outputs** | Script + Audio + Metadata | All artifacts saved to filesystem with timestamps | ✅ Pass |
| **VII. Scenario-Driven Design** | Commuter learning scenario | 2-3 min duration, clear progress, simple input | ✅ Pass |

**Gate Result**: ✅ PASS — All constitution principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-wiki-podcast-app/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: API specifications
│   └── api.yaml         # OpenAPI 3.0 spec
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── index.ts                 # Express app entry point
│   ├── routes/
│   │   └── podcast.ts           # POST /api/podcast endpoint
│   ├── services/
│   │   ├── wikipedia.ts         # Article fetching and cleaning
│   │   ├── scriptGenerator.ts   # xAI Grok integration
│   │   ├── tts.ts               # ElevenLabs integration
│   │   └── audioStitcher.ts     # FFmpeg audio processing
│   ├── prompts/
│   │   └── podcast.ts           # Version-controlled prompt template
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   └── utils/
│       ├── validation.ts        # Input validation
│       └── fileManager.ts       # Artifact storage
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── package.json
├── tsconfig.json
└── .env.example

frontend/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Main application component
│   ├── components/
│   │   ├── InputForm.tsx        # URL/title input
│   │   ├── ProgressTracker.tsx  # Generation stage indicators
│   │   ├── AudioPlayer.tsx      # Playback controls
│   │   └── DownloadButton.tsx   # MP3 download
│   ├── hooks/
│   │   └── usePodcastGeneration.ts  # Generation state management
│   ├── services/
│   │   └── api.ts               # Backend API client
│   └── styles/
│       └── index.css            # Tailwind imports
├── tests/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json

output/                          # Generated artifacts (gitignored)
├── scripts/                     # JSON script files
├── audio/                       # Final MP3 files
└── metadata/                    # Generation metadata

Dockerfile                       # Multi-stage build
docker-compose.yml               # Local development
.env.example                     # Required environment variables
```

**Structure Decision**: Web application structure with separate frontend and backend directories. The backend serves as an API server handling Wikipedia fetching, AI generation, TTS synthesis, and audio processing. The frontend is a React SPA bundled and served by the backend in production. Docker combines both into a single deployable container.

## Complexity Tracking

> No constitution violations requiring justification. Design adheres to all principles.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Monorepo structure | frontend/ + backend/ in single repo | Simplifies Docker build, shared types possible |
| No database | Filesystem storage only | Per constitution and FR-026, reduces complexity |
| Single container | Backend serves frontend static files | Per FR-024, simplifies deployment |
| Synchronous generation | No background jobs | Per constraints, keeps architecture simple |
