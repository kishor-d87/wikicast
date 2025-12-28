# Data Model: Wikipedia Podcast Generator

**Feature**: 001-wiki-podcast-app  
**Date**: 2025-12-22  
**Status**: Complete

## Overview

This document defines the data entities, their relationships, and validation rules for the Wikipedia Podcast Generator. Per FR-026 and FR-027, all data is stored on the local filesystem as JSON/MP3 files—no database is used.

---

## Entity Definitions

### 1. Article

Represents the source Wikipedia content.

```typescript
interface Article {
  /** Wikipedia article title (canonical form) */
  title: string;
  
  /** Full Wikipedia URL */
  url: string;
  
  /** Raw HTML content from Wikipedia API */
  rawContent: string;
  
  /** Cleaned plain text (no markup, citations, tables) */
  cleanedText: string;
  
  /** Article summary/extract (first paragraph) */
  summary: string;
  
  /** Word count of cleaned text */
  wordCount: number;
  
  /** ISO 8601 timestamp of when article was fetched */
  fetchedAt: string;
  
  /** Wikipedia article language code */
  language: "en";  // MVP: English only
}
```

**Validation Rules**:
- `title` must be non-empty, max 256 characters
- `url` must match pattern `https://en.wikipedia.org/wiki/*`
- `cleanedText` must have at least 500 characters (minimum viable article)
- `cleanedText` must have at most 50,000 characters (truncate if longer)
- `language` must be "en" for MVP

**Source**: FR-001, FR-002, FR-003, FR-005, FR-006

---

### 2. Speaker

Represents a conversation participant.

```typescript
interface Speaker {
  /** Speaker identifier */
  name: "Alex" | "Jordan";
  
  /** ElevenLabs voice ID */
  voiceId: string;
  
  /** Display name in script */
  displayName: string;
}

// Fixed configuration (not stored, defined in code)
const SPEAKERS: Record<string, Speaker> = {
  Alex: {
    name: "Alex",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    displayName: "Alex"
  },
  Jordan: {
    name: "Jordan", 
    voiceId: "AZnzlk1XvdvUeBnXmlld",
    displayName: "Jordan"
  }
} as const;
```

**Validation Rules**:
- Only two speakers permitted: Alex and Jordan
- Voice IDs are fixed, not user-configurable
- No other speakers allowed per constitution

**Source**: FR-009, FR-011, FR-014, Constitution III

---

### 3. ScriptLine

Represents a single line of dialogue in the script.

```typescript
interface ScriptLine {
  /** Line sequence number (1-indexed) */
  index: number;
  
  /** Speaker for this line */
  speaker: "Alex" | "Jordan";
  
  /** Spoken text content */
  text: string;
  
  /** Script section this line belongs to */
  section: ScriptSection;
}

type ScriptSection = 
  | "greeting"       // 1. Greeting + topic introduction
  | "explanation"    // 2. Core factual explanation
  | "clarification"  // 3. Engaging clarification or connection
  | "qna"           // 4. Back-and-forth Q&A
  | "signoff";      // 5. Wrap-up and sign-off
```

**Validation Rules**:
- `index` must be sequential starting from 1
- `speaker` must be exactly "Alex" or "Jordan"
- `text` must be non-empty, max 1000 characters per line
- `section` must be one of the five defined sections
- All five sections must appear in order

**Source**: FR-010, FR-011, Constitution II, Constitution III

---

### 4. Script

Represents the complete generated conversation.

```typescript
interface Script {
  /** Unique identifier (based on article + timestamp) */
  id: string;
  
  /** Reference to source article */
  articleTitle: string;
  articleUrl: string;
  
  /** Ordered list of dialogue lines */
  lines: ScriptLine[];
  
  /** Section breakdown for validation */
  sections: {
    greeting: number[];      // Line indices for greeting section
    explanation: number[];   // Line indices for explanation section
    clarification: number[]; // Line indices for clarification section
    qna: number[];          // Line indices for Q&A section
    signoff: number[];      // Line indices for sign-off section
  };
  
  /** Total word count of all dialogue */
  totalWords: number;
  
  /** Estimated duration in seconds (based on 150 WPM) */
  estimatedDuration: number;
  
  /** ISO 8601 timestamp of generation */
  generatedAt: string;
  
  /** AI model used for generation */
  model: string;
  
  /** Generation parameters for reproducibility */
  generationParams: {
    temperature: number;
    maxTokens: number;
    promptVersion: string;
  };
}
```

**Validation Rules**:
- `id` must follow pattern `{sanitized_title}_{timestamp}`
- `lines` must have at least 10 lines
- `estimatedDuration` must be between 120-180 seconds (2-3 minutes)
- All five sections must have at least one line
- Sections must appear in defined order (greeting → explanation → clarification → qna → signoff)
- No duplicate line indices
- Lines must alternate speakers reasonably (not strict alternation, but no 5+ consecutive same speaker)

**Source**: FR-009, FR-010, FR-011, FR-012, FR-021, FR-022, Constitution II

---

### 5. AudioSegment

Represents a single TTS-generated audio clip.

```typescript
interface AudioSegment {
  /** Line index this segment corresponds to */
  lineIndex: number;
  
  /** Speaker who voiced this segment */
  speaker: "Alex" | "Jordan";
  
  /** Path to temporary audio file */
  filePath: string;
  
  /** Duration in milliseconds */
  durationMs: number;
  
  /** Audio format */
  format: "mp3";
  
  /** Generation timestamp */
  generatedAt: string;
}
```

**Validation Rules**:
- `lineIndex` must correspond to valid Script line
- `filePath` must exist and be readable
- `durationMs` must be positive
- Total duration of all segments should approximate Script.estimatedDuration

**Source**: FR-013, FR-014

---

### 6. Podcast

Represents the final audio output.

```typescript
interface Podcast {
  /** Unique identifier (matches Script.id) */
  id: string;
  
  /** Reference to source script */
  scriptId: string;
  
  /** Reference to source article */
  articleTitle: string;
  articleUrl: string;
  
  /** Path to final MP3 file */
  audioFilePath: string;
  
  /** Actual duration in seconds */
  durationSeconds: number;
  
  /** File size in bytes */
  fileSizeBytes: number;
  
  /** Audio specifications */
  audioSpec: {
    format: "mp3";
    bitrate: "128k";
    sampleRate: 44100;
    channels: 1;  // Mono
  };
  
  /** Voice mapping used */
  voiceMapping: {
    Alex: string;    // Voice ID
    Jordan: string;  // Voice ID
  };
  
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  
  /** Generation pipeline version */
  pipelineVersion: string;
}
```

**Validation Rules**:
- `id` must match corresponding Script.id
- `durationSeconds` must be between 120-180 (SC-002)
- `audioFilePath` must exist and be playable
- `voiceMapping` must match fixed Speaker configuration

**Source**: FR-015, FR-016, FR-021, FR-022, SC-002, Constitution VI

---

### 7. GenerationMetadata

Represents traceability information for each generation run.

```typescript
interface GenerationMetadata {
  /** Unique generation ID */
  id: string;
  
  /** Source article information */
  source: {
    title: string;
    url: string;
    fetchedAt: string;
  };
  
  /** Script generation details */
  script: {
    id: string;
    generatedAt: string;
    model: string;
    promptVersion: string;
    temperature: number;
  };
  
  /** Audio generation details */
  audio: {
    id: string;
    createdAt: string;
    durationSeconds: number;
    voiceMapping: Record<string, string>;
  };
  
  /** Pipeline execution */
  pipeline: {
    version: string;
    startedAt: string;
    completedAt: string;
    stages: GenerationStage[];
  };
  
  /** Output artifacts */
  artifacts: {
    scriptPath: string;
    audioPath: string;
    metadataPath: string;
  };
}

interface GenerationStage {
  name: "fetch" | "generate_script" | "synthesize_audio" | "stitch_audio";
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
```

**Validation Rules**:
- All timestamps must be valid ISO 8601
- All artifact paths must exist
- All stages must complete for successful generation

**Source**: FR-018, Constitution VI

---

## Entity Relationships

```
┌─────────────┐
│   Article   │
│  (fetched)  │
└──────┬──────┘
       │ 1:1
       ▼
┌─────────────┐
│   Script    │──────┐
│ (generated) │      │
└──────┬──────┘      │
       │ 1:N         │
       ▼             │
┌─────────────┐      │
│ ScriptLine  │      │ All linked by
│  (in order) │      │ common ID
└──────┬──────┘      │
       │ 1:1         │
       ▼             │
┌─────────────┐      │
│AudioSegment │      │
│ (per line)  │      │
└──────┬──────┘      │
       │ N:1         │
       ▼             │
┌─────────────┐      │
│   Podcast   │◀─────┘
│   (final)   │
└──────┬──────┘
       │ 1:1
       ▼
┌─────────────────────┐
│ GenerationMetadata  │
│   (traceability)    │
└─────────────────────┘
```

---

## File Storage Layout

```
output/
├── scripts/
│   └── {id}.json           # Script entity as JSON
├── audio/
│   ├── segments/
│   │   └── {id}/
│   │       ├── 001.mp3     # AudioSegment files
│   │       ├── 002.mp3
│   │       └── ...
│   └── {id}.mp3            # Final Podcast MP3
└── metadata/
    └── {id}.json           # GenerationMetadata as JSON
```

---

## State Transitions

### Generation Pipeline States

```
[Input Received]
       │
       ▼
[Fetching Article] ──failed──► [Error: Article Not Found]
       │
       ▼ success
[Generating Script] ──failed──► [Error: Script Generation Failed]
       │
       ▼ success
[Synthesizing Audio] ──failed──► [Error: TTS Failed]
       │
       ▼ success
[Stitching Audio] ──failed──► [Error: Audio Processing Failed]
       │
       ▼ success
[Complete] ──► Podcast + Metadata saved
```

### Allowed Transitions

| From | To | Trigger |
|------|-----|---------|
| Input Received | Fetching Article | Valid URL/title submitted |
| Fetching Article | Generating Script | Article content retrieved |
| Fetching Article | Error | Wikipedia unavailable or invalid article |
| Generating Script | Synthesizing Audio | Script validated |
| Generating Script | Error | AI generation failed |
| Synthesizing Audio | Stitching Audio | All segments generated |
| Synthesizing Audio | Error | TTS API failed |
| Stitching Audio | Complete | Final MP3 created |
| Stitching Audio | Error | FFmpeg processing failed |

---

## Validation Summary

| Entity | Key Validations |
|--------|-----------------|
| Article | Valid Wikipedia URL, sufficient content length |
| Speaker | Only Alex or Jordan, fixed voice IDs |
| ScriptLine | Valid speaker, non-empty text, valid section |
| Script | 5 sections in order, 120-180s duration, proper speaker attribution |
| AudioSegment | Matches script line, valid audio file |
| Podcast | Duration 120-180s, playable MP3, matches script |
| GenerationMetadata | All stages completed, all artifacts exist |

