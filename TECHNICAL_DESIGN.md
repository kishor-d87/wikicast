# Wikipedia Podcast Generator - Technical Design Document

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Setup and Deployment](#3-setup-and-deployment)
4. [Code Explanations and Key Components](#4-code-explanations-and-key-components)
5. [Assumptions and Design Decisions](#5-assumptions-and-design-decisions)

---

## 1. Project Overview

### 1.1 Purpose
The Wikipedia Podcast Generator is a web application that automatically converts Wikipedia articles into 2-3 minute conversational audio podcasts. The system features two AI hosts (Nishi and Shyam) who discuss article content in an engaging, educational format with bilingual English-Hindi conversations.

### 1.2 Key Features
- **Input Flexibility**: Accepts Wikipedia URLs or article titles
- **AI-Powered Script Generation**: Uses xAI Grok to create conversational scripts
- **Natural Voice Synthesis**: Leverages ElevenLabs TTS for high-quality audio
- **Real-time Progress Tracking**: Shows generation stages to users
- **In-browser Playback**: Instant audio playback with download capability
- **Content Integrity**: Ensures all content is derived from source articles (no hallucinations)

### 1.3 Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Custom hooks for state management

**Backend:**
- Node.js 20 LTS
- Express.js (REST API)
- TypeScript
- FFmpeg (audio processing)

**External Services:**
- xAI Grok API (script generation)
- ElevenLabs API (text-to-speech)
- Wikipedia REST API (content fetching)

**Deployment:**
- Docker containerization
- Single container deployment
- Filesystem-based storage (no database)

### 1.4 Success Metrics
- ✅ Generation time: < 2 minutes
- ✅ Audio duration: 120-180 seconds
- ✅ Two distinct voices (Nishi and Shyam)
- ✅ 100% content traceability to source
- ✅ Container startup: < 30 seconds

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            React Frontend (Port 5173 / 3000)             │  │
│  │  - Input Form (URL/Title)                                │  │
│  │  - Progress Tracker                                      │  │
│  │  - Audio Player                                          │  │
│  │  - Download Button                                       │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└──────────────────────────┼────────────────────────────────────┘
                           │ HTTP/REST
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│              Express.js Backend (Port 3000)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   API Routes                            │   │
│  │  - POST /api/podcast     (generate)                     │   │
│  │  - GET  /api/podcast/:id (metadata)                     │   │
│  │  - GET  /api/podcast/:id/audio                          │   │
│  │  - GET  /api/health                                     │   │
│  └────────────┬────────────────────────────────────────────┘   │
│               │                                                 │
│  ┌────────────▼────────────────────────────────────────────┐   │
│  │            Podcast Orchestrator Service                 │   │
│  │  (Coordinates the 4-stage pipeline)                     │   │
│  └────┬────────┬────────┬────────┬─────────────────────────┘   │
│       │        │        │        │                              │
│  ┌────▼────┐ ┌▼────┐ ┌─▼────┐ ┌─▼───────┐                     │
│  │Wikipedia│ │Script│ │ TTS  │ │ Audio   │                     │
│  │ Service │ │ Gen  │ │Service│ │Stitcher │                    │
│  └────┬────┘ └┬─────┘ └┬─────┘ └┬────────┘                     │
└───────┼───────┼────────┼────────┼──────────────────────────────┘
        │       │        │        │
        │       │        │        │
┌───────▼───────▼────────▼────────▼──────────────────────────────┐
│                   External Services                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Wikipedia │  │   xAI    │  │ElevenLabs│  │  FFmpeg  │       │
│  │REST API  │  │   Grok   │  │   TTS    │  │ (Local)  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
        │               │              │              │
        ▼               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Filesystem Storage                            │
│  output/                                                         │
│  ├── scripts/{id}.json       (Generated scripts)                │
│  ├── audio/                                                      │
│  │   ├── segments/{id}/      (TTS segments)                     │
│  │   └── {id}.mp3            (Final podcasts)                   │
│  └── metadata/{id}.json      (Generation metadata)              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagram - Podcast Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE 1: FETCH ARTICLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input ──► Validation ──► Wikipedia API                    │
│  (URL/Title)     (format)       (REST v1)                       │
│                                     │                            │
│                                     ▼                            │
│                          ┌──────────────────┐                   │
│                          │  Article Entity  │                   │
│                          │  - title         │                   │
│                          │  - cleanedText   │                   │
│                          │  - wordCount     │                   │
│                          └────────┬─────────┘                   │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────┐
│                  STAGE 2: GENERATE SCRIPT                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Article ──► Prompt Template ──► xAI Grok API                    │
│  Content     (v1.0.0)            (grok-3, temp=0)                │
│                                        │                          │
│                                        ▼                          │
│                            ┌───────────────────┐                 │
│                            │  Script Entity    │                 │
│                            │  - 5 sections     │                 │
│                            │  - ScriptLine[]   │                 │
│                            │  - speaker attrs  │                 │
│                            │  - validation     │                 │
│                            └────────┬──────────┘                 │
│                                     │                             │
│                                     ▼                             │
│                          Save: output/scripts/{id}.json          │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
┌──────────────────────────────────▼───────────────────────────────┐
│                 STAGE 3: SYNTHESIZE AUDIO                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  For each ScriptLine:                                            │
│    │                                                              │
│    ├─► Map Speaker ──► Voice ID                                  │
│    │   (Nishi/Shyam)   (Fixed mapping)                           │
│    │                                                              │
│    ├─► ElevenLabs API ──► MP3 Segment                            │
│    │   (eleven_turbo_v2_5)                                       │
│    │                        │                                     │
│    └────────────────────────▼                                    │
│              Save: output/audio/segments/{id}/{index}.mp3        │
│                                                                   │
│  Result: AudioSegment[] (25-40 files typically)                  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                  STAGE 4: STITCH AUDIO                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  AudioSegment[] ──► FFmpeg Processing                            │
│                     (concat protocol)                            │
│                           │                                       │
│                           ├─► Concatenate segments               │
│                           ├─► Normalize volume                   │
│                           ├─► Convert to MP3                     │
│                           │    - 128k bitrate                    │
│                           │    - 44.1kHz sample rate             │
│                           │    - Mono channel                    │
│                           │                                       │
│                           ▼                                       │
│                Save: output/audio/{id}.mp3                       │
│                                                                   │
│  ┌────────────────────────────────────────────┐                 │
│  │         Podcast Entity Created             │                 │
│  │  - audioFilePath                           │                 │
│  │  - durationSeconds                         │                 │
│  │  - voiceMapping                            │                 │
│  └────────────────┬───────────────────────────┘                 │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              SAVE GENERATION METADATA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GenerationMetadata {                                           │
│    id, source, script, audio, pipeline, artifacts               │
│  }                                                               │
│              ▼                                                   │
│  Save: output/metadata/{id}.json                                │
│                                                                  │
│  ✅ Podcast Generation Complete                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Interaction Diagram

```
Frontend Components          Backend Services          External APIs
─────────────────           ────────────────          ─────────────

┌──────────────┐
│  InputForm   │───┐
└──────────────┘   │
                   │
┌──────────────┐   │
│ Progress     │   │  POST /api/podcast
│ Tracker      │◄──┼──────────────►┌─────────────────┐
└──────────────┘   │                │ Podcast Router  │
                   │                └────────┬────────┘
┌──────────────┐   │                         │
│ AudioPlayer  │◄──┤                         ▼
└──────────────┘   │                ┌─────────────────┐
                   │                │  Orchestrator   │
┌──────────────┐   │                └─┬──┬──┬────┬───┘
│ Download     │───┘                  │  │  │    │
│ Button       │                      │  │  │    │
└──────────────┘                      │  │  │    │
                                      │  │  │    │
                              ┌───────┘  │  │    └────────┐
                              │          │  │             │
                              ▼          ▼  ▼             ▼
                        ┌──────────┐ ┌────────┐    ┌──────────┐
                        │Wikipedia │ │Script  │    │   TTS    │
                        │ Service  │ │Gen Svc │    │ Service  │
                        └────┬─────┘ └───┬────┘    └────┬─────┘
                             │           │              │
                             ▼           ▼              ▼
                        ┌──────────┐ ┌────────┐    ┌──────────┐
                        │Wikipedia │ │  xAI   │    │ElevenLabs│
                        │   API    │ │  Grok  │    │   API    │
                        └──────────┘ └────────┘    └──────────┘
```

### 2.4 Data Model

```typescript
// Core Entities

Article {
  title: string
  url: string
  cleanedText: string
  wordCount: number
  fetchedAt: ISO8601
}
      │
      │ 1:1
      ▼
Script {
  id: string
  lines: ScriptLine[]
  sections: {
    greeting: number[]
    explanation: number[]
    clarification: number[]
    qna: number[]
    signoff: number[]
  }
  estimatedDuration: number
}
      │
      │ 1:N
      ▼
ScriptLine {
  index: number
  speaker: "Nishi" | "Shyam"
  text: string
  section: ScriptSection
}
      │
      │ 1:1
      ▼
AudioSegment {
  lineIndex: number
  speaker: "Nishi" | "Shyam"
  filePath: string
  durationMs: number
}
      │
      │ N:1
      ▼
Podcast {
  id: string
  audioFilePath: string
  durationSeconds: number
  voiceMapping: VoiceMapping
  audioSpec: AudioSpec
}
```

---

## 3. Setup and Deployment

### 3.1 Prerequisites

**Required:**
- Docker 24.x+ or Docker Desktop 4.x+
- xAI API Key (from https://x.ai)
- ElevenLabs API Key (from https://elevenlabs.io)

**For Local Development:**
- Node.js 20 LTS
- FFmpeg (audio processing)
- npm or yarn

### 3.2 Docker Deployment (Recommended)

#### Step 1: Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd audio_pod

# Create environment file
cp env.example .env

# Edit .env with your API keys
nano .env
```

#### Step 2: Set Environment Variables

Edit `.env`:

```bash
# Required API Keys
XAI_API_KEY=xai-your-key-here
ELEVENLABS_API_KEY=sk_your-key-here

# Optional Configuration
PORT=3000
OUTPUT_DIR=./output
NODE_ENV=production
```

#### Step 3: Build and Run

```bash
# Build Docker image
docker build -t wiki-podcast-generator .

# Run container
docker run -d \
  --name wiki-podcast \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/output:/app/output \
  wiki-podcast-generator

# View logs
docker logs -f wiki-podcast

# Access application
open http://localhost:3000
```

#### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "ffmpeg": "ok",
    "outputDir": "ok"
  }
}
```

### 3.3 Local Development Setup

#### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### Step 2: Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (Chocolatey)
choco install ffmpeg
```

#### Step 3: Configure Environment

```bash
# From project root
cp env.example .env
# Edit .env with your API keys
```

#### Step 4: Start Development Servers

```bash
# Terminal 1 - Backend (Port 3000)
cd backend
npm run dev

# Terminal 2 - Frontend (Port 5173)
cd frontend
npm run dev
```

#### Step 5: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: See `specs/001-wiki-podcast-app/contracts/api.yaml`

### 3.4 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XAI_API_KEY` | ✅ Yes | — | xAI Grok API key for script generation |
| `ELEVENLABS_API_KEY` | ✅ Yes | — | ElevenLabs API key for TTS |
| `PORT` | No | `3000` | Server port |
| `OUTPUT_DIR` | No | `./output` | Directory for generated files |
| `NODE_ENV` | No | `development` | Environment mode (development/production) |

### 3.5 File Structure After Deployment

```
audio_pod/
├── backend/
│   ├── src/                    # TypeScript source
│   ├── dist/                   # Compiled JavaScript
│   ├── node_modules/
│   └── package.json
├── frontend/
│   ├── src/                    # React components
│   ├── dist/                   # Built static files
│   ├── node_modules/
│   └── package.json
├── output/                     # Generated artifacts (gitignored)
│   ├── scripts/                # JSON script files
│   │   └── {id}.json
│   ├── audio/                  # Audio files
│   │   ├── segments/{id}/      # Individual TTS segments
│   │   └── {id}.mp3            # Final podcasts
│   └── metadata/               # Generation metadata
│       └── {id}.json
├── specs/                      # Documentation
│   └── 001-wiki-podcast-app/
│       ├── spec.md
│       ├── plan.md
│       ├── data-model.md
│       └── contracts/api.yaml
├── .env                        # Environment variables (not in git)
├── .env.example               # Template
├── Dockerfile                  # Docker configuration
└── docker-compose.yml          # Docker Compose (if used)
```

---

## 4. Code Explanations and Key Components

### 4.1 Backend Services

#### 4.1.1 Podcast Orchestrator

**Location**: `backend/src/services/podcastOrchestrator.ts`

**Purpose**: Coordinates the entire 4-stage podcast generation pipeline.

**Key Functions**:

```typescript
export async function generatePodcast(
  input: string,
  type?: 'url' | 'title',
  onProgress?: ProgressCallback
): Promise<Podcast>
```

**Pipeline Stages**:
1. **Fetch**: Retrieves Wikipedia article via REST API
2. **Generate Script**: Creates conversational script using xAI Grok
3. **Synthesize Audio**: Generates TTS segments via ElevenLabs
4. **Stitch Audio**: Combines segments using FFmpeg

**Error Handling**: Each stage can fail independently. The orchestrator marks the current stage as failed and propagates the error with context.

#### 4.1.2 Wikipedia Service

**Location**: `backend/src/services/wikipedia.ts`

**Purpose**: Fetches and cleans Wikipedia article content.

**Key Features**:
- Supports both URL and title-based fetching
- Uses Wikipedia REST API v1
- Cleans HTML to plain text (removes citations, markup)
- Validates content length (min: 500, max: 50,000 characters)
- Handles SSL certificates properly for production

**Example**:

```typescript
const article = await fetchArticle(
  "Albert Einstein",
  "title"
);
// Returns: Article { title, url, cleanedText, wordCount, ... }
```

#### 4.1.3 Script Generator

**Location**: `backend/src/services/scriptGenerator.ts`

**Purpose**: Generates structured podcast scripts using xAI Grok API.

**Key Features**:
- Uses deterministic settings (temperature=0)
- Enforces 5-section structure (greeting, explanation, clarification, Q&A, sign-off)
- Validates speaker attribution (only Nishi and Shyam)
- Calculates estimated duration (150 words per minute)
- Bilingual support (English + Hindi in Roman script)

**Validation Rules**:
- Minimum 10 lines
- All 5 sections present in correct order
- No more than 5 consecutive lines by same speaker
- Target duration: 120-180 seconds

**Prompt Template**: Version-controlled in `backend/src/prompts/podcast.ts`

```typescript
GENERATION_PARAMS = {
  model: 'grok-3',
  temperature: 0,      // Deterministic
  maxTokens: 4096,
  topP: 1
}
```

#### 4.1.4 TTS Service

**Location**: `backend/src/services/tts.ts`

**Purpose**: Synthesizes audio segments using ElevenLabs API.

**Speaker Voice Mapping**:
```typescript
const SPEAKERS = {
  Nishi: { voiceId: "..." },  // Enthusiastic host
  Shyam: { voiceId: "..." }   // Knowledgeable host
}
```

**TTS Configuration**:
- Model: `eleven_turbo_v2_5`
- Stability: 0.75
- Similarity boost: 0.75
- Speaker boost: enabled

**Retry Logic**: Implements exponential backoff (max 2 retries) for transient API failures.

#### 4.1.5 Audio Stitcher

**Location**: `backend/src/services/audioStitcher.ts`

**Purpose**: Combines audio segments into final MP3 using FFmpeg.

**Process**:
1. Creates concat file listing all segments in order
2. Uses FFmpeg concat protocol
3. Normalizes audio volume
4. Outputs MP3 with specifications:
   - Bitrate: 128k
   - Sample rate: 44.1kHz
   - Channels: 1 (mono)

**FFmpeg Command Example**:
```bash
ffmpeg -f concat -safe 0 -i filelist.txt \
  -af "loudnorm" \
  -c:a libmp3lame -b:a 128k \
  output.mp3
```

### 4.2 Frontend Components

#### 4.2.1 Main Application

**Location**: `frontend/src/App.tsx`

**Features**:
- Single-page interface
- State management via custom hook (`usePodcastGeneration`)
- Responsive design with Tailwind CSS
- Progress tracking with visual indicators
- Audio playback with native HTML5 player
- Download functionality

**Component Structure**:
```
App
├── InputForm (URL/title input)
├── ProgressTracker (4 stages with status)
├── AudioPlayer (playback controls)
├── DownloadButton (MP3 download)
└── FeatureCard (info cards)
```

#### 4.2.2 Custom Hook - usePodcastGeneration

**Location**: `frontend/src/hooks/usePodcastGeneration.ts`

**Purpose**: Manages podcast generation state and API interactions.

**State Machine**:
```typescript
type State = 'idle' | 'loading' | 'success' | 'error'

const { 
  state,         // Current state
  result,        // Podcast result
  error,         // Error message
  progress,      // Current stage
  generate,      // Trigger generation
  reset,         // Reset to idle
  isLoading,     // Boolean helpers
  isSuccess,
  isError
} = usePodcastGeneration();
```

#### 4.2.3 API Client

**Location**: `frontend/src/services/api.ts`

**Endpoints**:
```typescript
// Generate podcast
POST /api/podcast
Body: { input: string, type: 'url' | 'title' }

// Get metadata
GET /api/podcast/:id

// Get audio
GET /api/podcast/:id/audio

// Get script
GET /api/podcast/:id/script

// Health check
GET /api/health
```

### 4.3 Key Algorithms

#### 4.3.1 Script ID Generation

```typescript
function generateScriptId(articleTitle: string): string {
  // Sanitize title (lowercase, alphanumeric only)
  const sanitized = articleTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  // Add timestamp
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  
  return `${sanitized}_${timestamp}`;
}

// Example: "albert_einstein_20251228_143052"
```

#### 4.3.2 Duration Estimation

```typescript
function calculateDuration(lines: ScriptLine[]): number {
  const totalWords = lines.reduce((sum, line) => 
    sum + line.text.split(/\s+/).length, 0
  );
  
  // 150 words per minute average speaking rate
  const estimatedDuration = Math.round((totalWords / 150) * 60);
  
  return estimatedDuration; // in seconds
}
```

#### 4.3.3 Script Validation

```typescript
function validateScript(lines: ScriptLine[]): void {
  // 1. Check minimum lines
  if (lines.length < 10) {
    throw new Error('Script too short');
  }
  
  // 2. Check all 5 sections present
  const sections = new Set(lines.map(l => l.section));
  const required = ['greeting', 'explanation', 'clarification', 'qna', 'signoff'];
  required.forEach(section => {
    if (!sections.has(section)) {
      throw new Error(`Missing section: ${section}`);
    }
  });
  
  // 3. Check section order
  const order = ['greeting', 'explanation', 'clarification', 'qna', 'signoff'];
  let lastIndex = -1;
  for (const line of lines) {
    const currentIndex = order.indexOf(line.section);
    if (currentIndex < lastIndex) {
      throw new Error('Sections out of order');
    }
    lastIndex = currentIndex;
  }
  
  // 4. Check speaker alternation (max 5 consecutive)
  let consecutiveCount = 1;
  let lastSpeaker = lines[0]?.speaker;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].speaker === lastSpeaker) {
      consecutiveCount++;
      if (consecutiveCount > 5) {
        throw new Error('Too many consecutive lines by same speaker');
      }
    } else {
      consecutiveCount = 1;
      lastSpeaker = lines[i].speaker;
    }
  }
}
```

---

## 5. Assumptions and Design Decisions

### 5.1 Core Assumptions

1. **Single User Operation**: MVP designed for one user at a time; no concurrent processing optimization
2. **Ephemeral Podcasts**: Generated files are temporary; no long-term storage or retrieval system
3. **English Wikipedia Only**: MVP supports only English articles
4. **Stable Internet**: Requires reliable connection for external API calls
5. **Target Duration**: 2-3 minutes optimal for commuting/quick learning scenarios
6. **Generation Time**: Users accept 30-90 second wait time for generation

### 5.2 Architecture Decisions

#### 5.2.1 No Database
**Decision**: Use filesystem storage only

**Rationale**:
- Simplifies deployment (single container)
- Reduces infrastructure complexity
- Sufficient for MVP scope
- Easy to inspect and debug artifacts

**Trade-offs**:
- No query capability
- Limited to single-instance deployment
- Manual cleanup required for old files

#### 5.2.2 Synchronous Generation
**Decision**: Block HTTP request until podcast is complete

**Rationale**:
- Simpler client implementation
- No need for background job system
- Acceptable wait time (< 2 minutes)
- Real-time progress via callbacks

**Alternative**: Server-Sent Events (SSE) endpoint available for streaming progress

#### 5.2.3 Deterministic AI Settings
**Decision**: Use temperature=0 for script generation

**Rationale**:
- Ensures reproducible outputs
- Reduces hallucination risk
- Aligns with educational intent
- Predictable script structure

**Trade-off**: Less creative/varied output

#### 5.2.4 Fixed Speaker Configuration
**Decision**: Hardcode two speakers (Nishi and Shyam) with fixed voice IDs

**Rationale**:
- Constitution requirement (exactly 2 speakers)
- Consistent audio quality
- Simplified voice mapping
- No user configuration needed

**Trade-off**: No customization options

#### 5.2.5 Bilingual Conversations
**Decision**: Mix English and Hindi naturally in conversations

**Rationale**:
- Reflects authentic Indian conversation patterns
- Maintains formality for technical terms (English)
- Adds warmth and relatability (Hindi)
- Differentiates from pure English podcasts

**Implementation**: Hindi in Roman script for TTS compatibility

#### 5.2.6 Monorepo Structure
**Decision**: Single repository with `backend/` and `frontend/` directories

**Rationale**:
- Simplified Docker build
- Shared TypeScript types
- Single version control
- Easy local development

### 5.3 API Design Decisions

#### 5.3.1 RESTful Endpoints
**Decision**: Use REST over WebSockets or GraphQL

**Rationale**:
- Simple HTTP client integration
- Cacheable responses
- Standard error handling
- Sufficient for current use case

#### 5.3.2 File Serving
**Decision**: Backend serves audio files directly (not CDN)

**Rationale**:
- MVP simplicity
- No external dependencies
- Acceptable performance for single user
- Easy access control

**Future Enhancement**: CDN for production scale

### 5.4 Security Decisions

#### 5.4.1 No Authentication
**Decision**: Open API (no auth required)

**Rationale**:
- MVP/demo application
- Single-user assumption
- Reduces complexity
- API keys secured in environment variables

**Production Requirement**: Add authentication before multi-user deployment

#### 5.4.2 Input Validation
**Decision**: Strict validation on Wikipedia URLs and article titles

**Implemented Checks**:
- URL format validation (must be en.wikipedia.org)
- Content length validation (500-50,000 characters)
- Speaker name validation (only Nishi/Shyam)
- Section structure validation

### 5.5 Performance Optimizations

1. **Parallel API Calls**: Where possible (future enhancement)
2. **TTS Retry Logic**: Exponential backoff for transient failures
3. **Content Truncation**: Limits article size to avoid context window issues
4. **FFmpeg Optimization**: Uses concat protocol for efficient stitching
5. **Development Mode**: Reduced logging and HTTPS verification in dev

### 5.6 Error Handling Strategy

**Philosophy**: Fail fast with clear error messages

**Implementation**:
- Each pipeline stage can fail independently
- Errors propagate with stage context
- Frontend displays user-friendly messages
- Backend logs detailed error information

**Error Categories**:
1. **Input Errors**: Invalid URL, article not found
2. **API Errors**: External service failures (Wikipedia, xAI, ElevenLabs)
3. **Processing Errors**: Script validation, audio stitching failures
4. **System Errors**: FFmpeg not found, filesystem issues

### 5.7 Testing Strategy

**Levels**:
1. **Unit Tests**: Individual service functions
2. **Integration Tests**: API endpoint testing
3. **Contract Tests**: API spec compliance
4. **Manual Testing**: End-to-end user flows

**Test Frameworks**:
- Backend: Jest
- Frontend: Vitest
- E2E: Playwright (planned)

---

## Appendix

### A. API Quick Reference

```bash
# Generate podcast
curl -X POST http://localhost:3000/api/podcast \
  -H "Content-Type: application/json" \
  -d '{"input": "Albert Einstein", "type": "title"}'

# Get metadata
curl http://localhost:3000/api/podcast/{id}

# Download audio
curl -O http://localhost:3000/api/podcast/{id}/audio

# Health check
curl http://localhost:3000/api/health
```

### B. File Naming Convention

```
Script ID Format: {sanitized_title}_{timestamp}

Examples:
- albert_einstein_20251228_143052
- quantum_computing_20251228_150230
- indian_premier_league_20251227_121659

Files Generated:
- output/scripts/{id}.json
- output/audio/{id}.mp3
- output/audio/segments/{id}/001.mp3, 002.mp3, ...
- output/metadata/{id}.json
```

### C. Constitution Principles

The application adheres to 7 core principles:

1. **Content Integrity**: Facts from source only
2. **Structural Consistency**: 5-section podcast structure
3. **Speaker Discipline**: Exactly Nishi and Shyam
4. **Audio Predictability**: Same input → same output
5. **Deterministic AI**: Template-based prompts, low temperature
6. **Observable Outputs**: Script + Audio + Metadata saved
7. **Scenario-Driven**: Optimized for commuter learning

### D. Troubleshooting Guide

**Common Issues**:

1. **"FFmpeg not found"**
   - Install FFmpeg: `brew install ffmpeg` (macOS)
   - Verify: `ffmpeg -version`

2. **"API Key Invalid"**
   - Check .env file exists and has correct keys
   - Verify keys are not expired

3. **"Article not found"**
   - Ensure URL is en.wikipedia.org
   - Check article exists in browser first

4. **Generation timeout**
   - Check internet connection
   - View backend logs: `docker logs wiki-podcast`
   - Typical time: 30-90 seconds

5. **Audio playback issues**
   - Check browser console for errors
   - Verify MP3 file exists in output/audio/
   - Try downloading and playing locally

---

## Document Version

- **Version**: 1.0.0
- **Date**: December 28, 2025
- **Status**: Complete
- **Last Updated**: Initial creation

---

This technical design document provides a comprehensive overview of the Wikipedia Podcast Generator system. For quick start instructions, see [README.md](./README.md). For detailed specifications, refer to the documentation in the `specs/` directory.

