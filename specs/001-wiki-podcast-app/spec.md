# Feature Specification: Wikipedia Podcast Generator

**Feature Branch**: `001-wiki-podcast-app`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: User description: "Build a Dockerized web application that converts a Wikipedia article into a short conversational audio podcast"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Podcast from Wikipedia URL (Priority: P1)

A user wants to quickly learn about a topic by listening to a podcast instead of reading a long Wikipedia article. They paste the Wikipedia URL into the application, wait for the generation process, and receive an audio podcast they can play immediately or download for later.

**Why this priority**: This is the core value proposition of the product — transforming written knowledge into audio. Without this capability, the application has no purpose.

**Independent Test**: Can be fully tested by providing any valid Wikipedia article URL and verifying that a playable podcast is produced with content derived from that article.

**Acceptance Scenarios**:

1. **Given** a user is on the application homepage, **When** they paste a valid Wikipedia URL and submit, **Then** the system displays progress indicators and produces a playable podcast within a reasonable time.

2. **Given** a user has submitted a Wikipedia URL, **When** the podcast generation completes, **Then** the audio plays in the browser and the content reflects the source article without fabricated information.

3. **Given** a user has a generated podcast, **When** they click the download button, **Then** an MP3 file is downloaded to their device.

---

### User Story 2 - Generate Podcast from Article Title (Priority: P2)

A user knows the topic they want to learn about but doesn't have the exact Wikipedia URL. They type the article title (e.g., "Albert Einstein" or "Quantum Computing") and the system finds and processes the corresponding Wikipedia article.

**Why this priority**: Improves discoverability and usability — users shouldn't need to navigate to Wikipedia first just to copy a URL. However, the core generation flow (P1) must work first.

**Independent Test**: Can be tested by entering well-known topic names and verifying the correct Wikipedia article is identified and processed.

**Acceptance Scenarios**:

1. **Given** a user is on the application homepage, **When** they type an article title (e.g., "Mount Everest") and submit, **Then** the system resolves the title to the correct Wikipedia article and generates a podcast.

2. **Given** a user enters an ambiguous title with multiple possible articles, **When** the system processes the request, **Then** the system selects the primary/most relevant article and proceeds with generation.

---

### User Story 3 - Track Generation Progress (Priority: P3)

A user submits a Wikipedia article and wants to understand what's happening during the generation process. They see clear progress indicators showing each stage: fetching the article, writing the script, and generating voices.

**Why this priority**: Transparency and user confidence are important for a process that takes time, but the core functionality must work before enhancing the experience.

**Independent Test**: Can be tested by observing the UI during generation and verifying that progress stages are displayed accurately and in sequence.

**Acceptance Scenarios**:

1. **Given** a user has submitted an article for processing, **When** the system is fetching article content, **Then** a "Fetching article" indicator is displayed.

2. **Given** article content has been fetched, **When** the system is generating the script, **Then** a "Writing script" indicator is displayed.

3. **Given** the script has been generated, **When** the system is synthesizing audio, **Then** a "Generating voices" indicator is displayed.

4. **Given** all stages complete successfully, **When** the podcast is ready, **Then** the progress indicators transition to a "Complete" state with playback controls visible.

---

### Edge Cases

- **Invalid URL**: User provides a URL that is not a valid Wikipedia article (e.g., non-Wikipedia site, disambiguation page, or non-existent article)
- **Article too short**: Wikipedia article has insufficient content to generate a meaningful 2-minute podcast
- **Article too long**: Wikipedia article is extremely long; system must extract key information within time constraints
- **Network failure**: External service (Wikipedia, AI, or TTS) is temporarily unavailable
- **Unsupported language**: User provides a non-English Wikipedia article (MVP supports English only)
- **Special characters**: Article title contains special characters, accents, or non-ASCII characters

## Requirements *(mandatory)*

### Functional Requirements

#### Input Handling

- **FR-001**: System MUST accept a valid Wikipedia article URL as input
- **FR-002**: System MUST accept a Wikipedia article title as input and resolve it to the correct article
- **FR-003**: System MUST validate that the provided URL points to a Wikipedia article before processing
- **FR-004**: System MUST display a clear error message when input is invalid or cannot be processed

#### Content Processing

- **FR-005**: System MUST fetch the full text content of the Wikipedia article
- **FR-006**: System MUST clean and normalize article content (remove markup, citations, and non-prose elements)
- **FR-007**: System MUST extract only factual information present in the source article
- **FR-008**: System MUST NOT introduce facts, statistics, dates, or claims not present in the source article

#### Script Generation

- **FR-009**: System MUST generate a conversational script between exactly two speakers: Alex and Jordan
- **FR-010**: System MUST produce scripts that follow this structure:
  1. Greeting and topic introduction
  2. Core factual explanation
  3. At least one engaging clarification or connection
  4. Back-and-forth Q&A between hosts
  5. Clear wrap-up and sign-off
- **FR-011**: System MUST attribute every spoken line to either Alex or Jordan (no unattributed narration)
- **FR-012**: System MUST produce scripts that result in 2–3 minutes of audio when spoken

#### Audio Generation

- **FR-013**: System MUST convert the script into audio using two distinct voices
- **FR-014**: System MUST maintain consistent voice-to-speaker mapping (same voice for Alex, same voice for Jordan)
- **FR-015**: System MUST combine all audio segments into a single continuous audio file
- **FR-016**: System MUST output audio in MP3 format

#### User Interface

- **FR-017**: System MUST provide a single-page interface for all interactions
- **FR-018**: System MUST display progress indicators during generation showing current stage
- **FR-019**: System MUST provide in-browser audio playback for generated podcasts
- **FR-020**: System MUST provide a download button for the generated MP3 file

#### Determinism & Traceability

- **FR-021**: System MUST produce consistent script structure for the same input article
- **FR-022**: System MUST produce consistent speaker ordering for the same script
- **FR-023**: System MUST use deterministic AI generation settings (low creativity/temperature)

#### Deployment & Operations

- **FR-024**: System MUST run as a single containerized application
- **FR-025**: System MUST accept API credentials via environment variables
- **FR-026**: System MUST function without requiring a database
- **FR-027**: System MUST store generated files on the local filesystem only

### Key Entities

- **Article**: Represents the source Wikipedia content — includes title, URL, raw content, and cleaned text
- **Script**: Represents the generated conversation — includes speaker-attributed lines in sequence, derived from a specific article
- **Podcast**: Represents the final audio output — includes audio file, duration, source article reference, and generation timestamp
- **Speaker**: Represents a conversation participant — has a fixed name (Alex or Jordan) and assigned voice identity

## Assumptions

- Users have a stable internet connection for fetching Wikipedia articles and generating audio
- English Wikipedia articles provide sufficient content for podcast generation
- 2–3 minute duration is optimal for the target use case (learning while commuting)
- Users understand that podcast generation takes time (estimated 30–90 seconds)
- MVP targets individual users; no concurrent multi-user optimization required
- Generated podcasts are ephemeral; no long-term storage or retrieval required in MVP

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a podcast from any valid English Wikipedia article in under 2 minutes of wait time
- **SC-002**: Generated podcasts have a duration between 120 and 180 seconds
- **SC-003**: Two distinct speaker voices are audible in every generated podcast
- **SC-004**: 100% of spoken content in generated podcasts can be traced to the source article (no hallucinated facts)
- **SC-005**: Users can complete the end-to-end flow (input → playback) on first attempt without external help
- **SC-006**: Generated audio plays without errors from start to finish
- **SC-007**: Application starts and becomes usable within 30 seconds of container launch
- **SC-008**: Users can download the generated podcast as a standard MP3 file playable on any device
