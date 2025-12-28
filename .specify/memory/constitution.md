<!--
=============================================================================
SYNC IMPACT REPORT
=============================================================================
Version Change: N/A → 1.0.0 (Initial ratification)

Added Sections:
  - Purpose & Vision
  - Core Principles (7 principles)
    1. Content Integrity
    2. Structural Consistency
    3. Speaker Discipline
    4. Audio Predictability
    5. Deterministic AI Behavior
    6. Observable Outputs
    7. Scenario-Driven Design
  - Scope Boundaries
  - Acceptance Criteria
  - Evolution Rules
  - Ethical & UX Commitments
  - Governance

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - No changes needed (constitution check placeholder)
  ✅ .specify/templates/spec-template.md - No changes needed (user scenarios align)
  ✅ .specify/templates/tasks-template.md - No changes needed (phase structure compatible)

Follow-up TODOs: None
=============================================================================
-->

# Conversational Podcast Generator Constitution

## Purpose & Vision

Transform factual written knowledge (Wikipedia articles) into short, conversational, multi-speaker audio podcasts that are:

- **Accurate** — Facts originate exclusively from source material
- **Predictable** — Same inputs produce consistent outputs
- **Reproducible** — Generation process is deterministic and traceable
- **Pleasant to listen to** — Natural conversational flow between hosts

This system transforms trusted written knowledge into trusted spoken knowledge — consistently, transparently, and repeatably.

### Core Product Principle

Every generated podcast MUST be traceable, factual, and explainable.

This project explicitly avoids:

- Hallucinated facts
- Unbounded creativity
- Uncontrolled prompt behavior

## Core Principles

### I. Content Integrity

All spoken content MUST originate exclusively from the supplied source article.

**Non-Negotiable Rules:**

- All spoken facts MUST originate from the supplied article
- No external facts, opinions, or speculation permitted
- No invented statistics, dates, or achievements
- No information synthesis from outside the source document

**Rationale:** Educational content loses trust when facts cannot be traced to authoritative sources. Users rely on the system to faithfully represent the source material without embellishment.

### II. Structural Consistency

Every generated podcast MUST follow a predictable, documented structure.

**Required Structure (in order):**

1. Greeting + topic introduction
2. Core factual explanation
3. At least one engaging clarification or connection
4. Back-and-forth Q&A between hosts
5. Clear wrap-up and sign-off

**Non-Negotiable Rules:**

- Structure MUST NOT vary between generations
- All five sections MUST be present in every output
- Section order MUST be preserved

**Rationale:** Predictable structure enables quality assurance, sets listener expectations, and ensures consistent educational value across all generated content.

### III. Speaker Discipline

Audio output MUST feature exactly two clearly attributed speakers.

**Non-Negotiable Rules:**

- Exactly two speakers: **Alex** and **Jordan**
- Each line MUST be clearly attributed to one speaker
- No narration without a speaker attribution
- No third speaker or narrator voice

**Rationale:** Consistent speaker identity enables voice mapping, ensures audio predictability, and creates a recognizable podcast format.

### IV. Audio Predictability

The generation pipeline MUST be deterministic and reproducible.

**Non-Negotiable Rules:**

- Same input article → same script structure
- Same script → same speaker order
- Same voice mapping per speaker across all generations
- Deterministic file naming for all outputs

**Rationale:** Reproducibility enables debugging, quality assurance, and user trust. Non-deterministic behavior makes failures impossible to diagnose.

### V. Deterministic AI Behavior

AI generation MUST be constrained and predictable.

**Prompt Rules:**

- Prompts MUST be template-based
- No free-form prompt concatenation permitted
- Temperature MUST be fixed (low creativity setting)
- All prompt templates MUST be version-controlled

**Generation Rules:**

- One script generation pass only
- No recursive self-improvement
- No prompt chaining without explicit specification
- No dynamic prompt modification at runtime

**Rationale:** Uncontrolled AI behavior introduces unpredictability, potential hallucinations, and makes output quality impossible to guarantee.

### VI. Observable Outputs

Every generation run MUST produce traceable artifacts.

**Required Artifacts:**

| Artifact | Contents | Purpose |
|----------|----------|---------|
| Script | Speaker-tagged text | Inspection and debugging |
| Audio | Final MP3 file | End-user deliverable |
| Metadata | Source article, timestamp, voice mapping | Traceability and audit |

**Non-Negotiable Rules:**

- All artifacts MUST be stored or logged for inspection
- Deterministic file naming MUST be applied
- Generation timestamp MUST be recorded
- Source article reference MUST be preserved

**Rationale:** Observability enables debugging, quality assurance, and compliance verification. Silent failures are unacceptable.

### VII. Scenario-Driven Design

The system is designed around explicit user scenarios, not open-ended prompts.

**Primary Scenario:**

> "User wants to learn an unfamiliar topic while commuting, without reading."

**Expected Outcome:**

- A short, friendly podcast (2-3 minutes)
- Understandable without prior context
- Completed listening within commute time

**Failure Scenario Handling:**

| Scenario | Required Behavior |
|----------|-------------------|
| Article too short | System explains limitation clearly |
| Unsupported language | Graceful fallback with user notification |
| TTS failure | Retry with deterministic behavior |

**Rationale:** Scenario-driven design ensures the product solves real user problems rather than becoming a general-purpose tool without clear purpose.

## Scope Boundaries

### In Scope (MVP)

- Wikipedia article ingestion
- Conversational script generation (Alex & Jordan)
- Multi-voice text-to-speech synthesis
- Single MP3 output file
- English + Hindi (Hinglish) casual narration
- 2–3 minute duration podcasts

### Out of Scope (MVP)

- User-uploaded documents
- Live web browsing beyond Wikipedia
- Music generation or background audio
- Voice cloning or custom voices
- Real-time streaming output

## Acceptance Criteria

A podcast is considered **valid** if and only if ALL of the following hold:

| Criterion | Requirement |
|-----------|-------------|
| Duration | Between 120–180 seconds |
| Voices | Two distinct voices audible |
| Factual accuracy | No claims outside source article |
| Conversational flow | Natural dialogue between hosts |
| Playability | Audio plays end-to-end without errors |
| Structure | All five required sections present |
| Attribution | Every line attributed to Alex or Jordan |

## Evolution Rules

### Permitted Changes

Changes to this constitution are allowed only if:

1. They preserve ALL existing invariants
2. They introduce a new documented scenario
3. They improve predictability or UX clarity

### Breaking Changes

Breaking changes require:

1. Updated constitution with version increment
2. Updated acceptance criteria
3. Migration plan for existing implementations
4. Explicit documentation of what changed and why

## Ethical & UX Commitments

- **No sensationalism** — Content MUST remain educational and factual
- **No misleading simplifications** — Simplify for clarity, never for manipulation
- **Clear educational intent** — Every podcast serves to inform, not persuade
- **Transparent limitations** — Users MUST be informed when content cannot be generated

## Governance

### Amendment Procedure

1. Propose change with rationale
2. Document impact on existing invariants
3. Update version according to semantic versioning
4. Update all dependent templates and documentation
5. Record amendment in Sync Impact Report

### Versioning Policy

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

- All implementation PRs MUST verify compliance with this constitution
- Complexity additions MUST be justified against principles
- Constitution violations block merge until resolved

**Version**: 1.0.0 | **Ratified**: 2025-12-22 | **Last Amended**: 2025-12-22
