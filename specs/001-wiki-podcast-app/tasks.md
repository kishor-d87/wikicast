# Tasks: Wikipedia Podcast Generator

**Input**: Design documents from `/specs/001-wiki-podcast-app/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.yaml ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths use web app convention: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per plan.md
- [x] T002 [P] Initialize backend Node.js project in `backend/package.json` with TypeScript, Express, dependencies
- [x] T003 [P] Initialize frontend Vite+React project in `frontend/package.json` with TypeScript, Tailwind
- [x] T004 [P] Configure TypeScript in `backend/tsconfig.json`
- [x] T005 [P] Configure TypeScript in `frontend/tsconfig.json`
- [x] T006 [P] Configure Tailwind CSS in `frontend/tailwind.config.js`
- [x] T007 [P] Create `env.example` with XAI_API_KEY, ELEVENLABS_API_KEY, PORT, OUTPUT_DIR
- [x] T008 [P] Create `.gitignore` with node_modules, dist, output/, .env

**Checkpoint**: Project scaffolding complete, can run `npm install` in both directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Types & Configuration

- [x] T009 Define shared TypeScript types in `backend/src/types/index.ts` (Article, Script, ScriptLine, Speaker, Podcast, GenerationMetadata per data-model.md)
- [x] T010 [P] Create speaker configuration constants in `backend/src/config/speakers.ts` (Alex/Jordan voice IDs)
- [x] T011 [P] Create environment config loader in `backend/src/config/env.ts`

### Backend Core Services (Shared)

- [x] T012 Implement file manager utility in `backend/src/utils/fileManager.ts` (create output dirs, save/load JSON, deterministic naming)
- [x] T013 [P] Implement input validation utility in `backend/src/utils/validation.ts` (URL validation, title sanitization)
- [x] T014 [P] Create error types and handler in `backend/src/utils/errors.ts` (INVALID_INPUT, ARTICLE_NOT_FOUND, etc.)

### Backend Express Setup

- [x] T015 Create Express app entry point in `backend/src/index.ts` (middleware, static files, error handler)
- [x] T016 Implement health check endpoint in `backend/src/routes/health.ts` (GET /api/health per api.yaml)

### Frontend Base Setup

- [x] T017 Create React entry point in `frontend/src/main.tsx`
- [x] T018 Create base App component in `frontend/src/App.tsx` (single-page layout shell)
- [x] T019 [P] Configure Tailwind base styles in `frontend/src/styles/index.css`
- [x] T020 [P] Create API client in `frontend/src/services/api.ts` (base fetch wrapper)

**Checkpoint**: Foundation ready — backend serves health endpoint, frontend renders shell

---

## Phase 3: User Story 1 - Generate Podcast from Wikipedia URL (Priority: P1) 🎯 MVP

**Goal**: User pastes Wikipedia URL → receives playable podcast with download option

**Independent Test**: Provide any valid Wikipedia URL, verify playable MP3 is produced with content from article

### Backend Services for US1

- [x] T021 [US1] Implement Wikipedia service in `backend/src/services/wikipedia.ts`
  - Fetch article by URL via Wikipedia REST API
  - Clean HTML to plain text
  - Validate minimum content length (500 chars)
  - Return Article entity

- [x] T022 [US1] Create podcast prompt template in `backend/src/prompts/podcast.ts`
  - System prompt: Alex/Jordan personas, 5-section structure, content integrity rules
  - User prompt template: article content injection
  - Version-controlled prompt string

- [x] T023 [US1] Implement script generator service in `backend/src/services/scriptGenerator.ts`
  - Call xAI Grok API with temperature=0
  - Parse JSON response into Script entity
  - Validate 5 sections present, speakers valid
  - Calculate estimated duration (150 WPM)

- [x] T024 [US1] Implement TTS service in `backend/src/services/tts.ts`
  - Call ElevenLabs API for each script line
  - Map speaker to voice ID
  - Save audio segments to temp files
  - Return AudioSegment array

- [x] T025 [US1] Implement audio stitcher service in `backend/src/services/audioStitcher.ts`
  - Concatenate audio segments using FFmpeg
  - Apply loudnorm filter
  - Output MP3 at 128kbps
  - Return final file path

- [x] T026 [US1] Create podcast orchestrator in `backend/src/services/podcastOrchestrator.ts`
  - Coordinate: fetch → generate → synthesize → stitch
  - Save script JSON, metadata JSON, final MP3
  - Return Podcast entity

### Backend Routes for US1

- [x] T027 [US1] Implement POST /api/podcast endpoint in `backend/src/routes/podcast.ts`
  - Accept { input, type: "url" }
  - Call orchestrator
  - Return PodcastResponse per api.yaml

- [x] T028 [US1] Implement GET /api/podcast/:id/audio in `backend/src/routes/podcast.ts`
  - Serve MP3 file with proper headers
  - Content-Disposition for download

- [x] T029 [US1] Implement GET /api/podcast/:id/script in `backend/src/routes/podcast.ts`
  - Return Script JSON

- [x] T030 [US1] Implement GET /api/podcast/:id in `backend/src/routes/podcast.ts`
  - Return PodcastMetadata JSON

### Frontend Components for US1

- [x] T031 [US1] Create InputForm component in `frontend/src/components/InputForm.tsx`
  - Text input for URL
  - Submit button
  - Basic validation (URL format)
  - Loading state

- [x] T032 [US1] Create AudioPlayer component in `frontend/src/components/AudioPlayer.tsx`
  - HTML5 audio element
  - Play/pause controls
  - Progress bar
  - Duration display

- [x] T033 [US1] Create DownloadButton component in `frontend/src/components/DownloadButton.tsx`
  - Fetch audio blob
  - Trigger download with filename

- [x] T034 [US1] Create usePodcastGeneration hook in `frontend/src/hooks/usePodcastGeneration.ts`
  - Manage generation state (idle, loading, success, error)
  - Call POST /api/podcast
  - Store result (audioUrl, id)

- [x] T035 [US1] Wire up App.tsx with InputForm, AudioPlayer, DownloadButton
  - Show InputForm initially
  - On success: show AudioPlayer + DownloadButton
  - Basic error display

**Checkpoint**: User Story 1 complete — can generate podcast from Wikipedia URL, play in browser, download MP3

---

## Phase 4: User Story 2 - Generate Podcast from Article Title (Priority: P2)

**Goal**: User types article title → system resolves to Wikipedia URL → generates podcast

**Independent Test**: Enter "Albert Einstein" → verify correct article is fetched and processed

### Backend Enhancements for US2

- [ ] T036 [US2] Extend Wikipedia service in `backend/src/services/wikipedia.ts`
  - Add `fetchByTitle(title: string)` method
  - Use Wikipedia search API to resolve title
  - Handle disambiguation (select primary result)
  - Return Article entity

- [ ] T037 [US2] Update POST /api/podcast to handle type: "title"
  - Auto-detect input type if not specified
  - Route to appropriate fetch method

### Frontend Enhancements for US2

- [ ] T038 [US2] Update InputForm in `frontend/src/components/InputForm.tsx`
  - Add input type toggle (URL / Title)
  - Or: auto-detect based on input pattern
  - Placeholder text updates based on mode

- [ ] T039 [US2] Update API client to send correct type parameter

**Checkpoint**: User Story 2 complete — can generate podcast from article title

---

## Phase 5: User Story 3 - Track Generation Progress (Priority: P3)

**Goal**: User sees real-time progress indicators during generation

**Independent Test**: Submit article, observe progress stages displayed in correct sequence

### Backend Enhancements for US3

- [ ] T040 [US3] Implement SSE endpoint POST /api/podcast/stream in `backend/src/routes/podcast.ts`
  - Set SSE headers (text/event-stream)
  - Emit progress events per stage
  - Emit complete event with result
  - Emit error event on failure

- [ ] T041 [US3] Update podcastOrchestrator to accept progress callback
  - Callback invoked at each stage transition
  - Pass stage name and status

### Frontend Components for US3

- [ ] T042 [US3] Create ProgressTracker component in `frontend/src/components/ProgressTracker.tsx`
  - Display 4 stages: Fetching → Writing → Generating → Complete
  - Visual indicators (spinner, checkmark, current highlight)
  - Stage-specific messages

- [ ] T043 [US3] Update usePodcastGeneration hook to use SSE
  - Connect to /api/podcast/stream
  - Parse SSE events
  - Update progress state
  - Handle complete/error events

- [ ] T044 [US3] Wire ProgressTracker into App.tsx
  - Show during generation
  - Hide on complete/error

**Checkpoint**: User Story 3 complete — progress indicators show during generation

---

## Phase 6: Docker & Deployment

**Purpose**: Package application for single-container deployment per FR-024

- [ ] T045 Create multi-stage Dockerfile at project root
  - Stage 1: Build frontend (node:20-alpine)
  - Stage 2: Build backend (node:20-alpine)
  - Stage 3: Production (node:20-alpine + ffmpeg)
  - Copy frontend dist to backend public folder
  - Expose port, set entrypoint

- [ ] T046 [P] Create docker-compose.yml for local development
  - Mount source directories
  - Pass environment variables
  - Map ports

- [ ] T047 Update backend to serve static frontend files in production
  - Express static middleware for /public
  - Fallback to index.html for SPA routing

- [ ] T048 Test Docker build and run
  - Build image
  - Run container with env vars
  - Verify end-to-end flow

**Checkpoint**: Application runs via `docker run` with env vars

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, UX improvements

### Error Handling

- [ ] T049 [P] Implement error UI component in `frontend/src/components/ErrorDisplay.tsx`
  - Show user-friendly error messages
  - Retry button option

- [ ] T050 [P] Add error boundary to App.tsx

- [ ] T051 Handle edge cases in Wikipedia service
  - Article too short (< 500 chars)
  - Non-English article detection
  - Network timeout handling

### UX Polish

- [ ] T052 [P] Add loading skeleton/animation to InputForm
- [ ] T053 [P] Style AudioPlayer with Tailwind (modern, accessible)
- [ ] T054 [P] Add article info display (title, source link) after generation
- [ ] T055 [P] Add "Generate Another" button after completion

### Validation

- [ ] T056 Validate constitution compliance
  - Verify script has 5 sections
  - Verify only Alex/Jordan speakers
  - Verify duration 120-180s
  - Verify deterministic output (same input → same structure)

- [ ] T057 Run quickstart.md validation checklist

**Checkpoint**: Production-ready application

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    │
    ▼
Phase 2: Foundational ──────────────────────────────────┐
    │                                                   │
    ▼                                                   │
Phase 3: User Story 1 (P1) 🎯 MVP                       │
    │                                                   │
    ├───────────────────────────────────────────────────┤
    │                                                   │
    ▼                                                   ▼
Phase 4: User Story 2 (P2)              Phase 5: User Story 3 (P3)
    │                                                   │
    └───────────────────────┬───────────────────────────┘
                            │
                            ▼
                    Phase 6: Docker
                            │
                            ▼
                    Phase 7: Polish
```

### Within Each Phase

- Tasks marked [P] can run in parallel
- Models/Types before Services
- Services before Routes/Endpoints
- Backend endpoints before Frontend components that consume them

### Parallel Opportunities

| Phase | Parallel Tasks |
|-------|----------------|
| Phase 1 | T002, T003, T004, T005, T006, T007, T008 |
| Phase 2 | T010, T011, T013, T014, T019, T020 |
| Phase 3 | T031, T032, T033 (after T027-T030) |
| Phase 4 | T038, T039 (after T036-T037) |
| Phase 5 | T042, T043 (after T040-T041) |
| Phase 7 | T049, T050, T052, T053, T054, T055 |

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (~30 min)
2. Complete Phase 2: Foundational (~2 hours)
3. Complete Phase 3: User Story 1 (~4-6 hours)
4. **STOP and VALIDATE**: End-to-end test with real Wikipedia article
5. Phase 6: Docker (~1 hour) — deployable MVP!

### Full Feature Set

6. Phase 4: User Story 2 (~1 hour)
7. Phase 5: User Story 3 (~2 hours)
8. Phase 7: Polish (~2 hours)

### Estimated Total: 12-16 hours

---

## Task Summary

| Phase | Tasks | Parallel | Blocking |
|-------|-------|----------|----------|
| 1. Setup | T001-T008 | 7 | 1 |
| 2. Foundational | T009-T020 | 8 | 4 |
| 3. US1 (MVP) | T021-T035 | 3 | 12 |
| 4. US2 | T036-T039 | 2 | 2 |
| 5. US3 | T040-T044 | 2 | 3 |
| 6. Docker | T045-T048 | 1 | 3 |
| 7. Polish | T049-T057 | 6 | 3 |
| **Total** | **57 tasks** | | |

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- Constitution compliance checked in T056
- All services save artifacts to output/ for traceability (Constitution VI)
- Prompt template is version-controlled (Constitution V)
- Speaker mapping is fixed in config (Constitution III)

