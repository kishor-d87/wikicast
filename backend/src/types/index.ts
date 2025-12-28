/**
 * Wikipedia Podcast Generator - Shared TypeScript Types
 * 
 * These types define the data model for the entire application.
 * Based on data-model.md specification.
 */

// =============================================================================
// Speaker Types
// =============================================================================

/** Valid speaker names - exactly two speakers per constitution */
export type SpeakerName = "Nishi" | "Shyam";

/** Speaker configuration with voice mapping */
export interface Speaker {
  /** Speaker identifier */
  name: SpeakerName;
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Display name in script */
  displayName: string;
}

// =============================================================================
// Article Types
// =============================================================================

/** Represents the source Wikipedia content */
export interface Article {
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
  language: "en"; // MVP: English only
}

// =============================================================================
// Script Types
// =============================================================================

/** Script section identifiers - must appear in this order */
export type ScriptSection =
  | "greeting"       // 1. Greeting + topic introduction
  | "explanation"    // 2. Core factual explanation
  | "clarification"  // 3. Engaging clarification or connection
  | "qna"           // 4. Back-and-forth Q&A
  | "signoff";      // 5. Wrap-up and sign-off

/** Ordered list of sections for validation */
export const SCRIPT_SECTIONS_ORDER: readonly ScriptSection[] = [
  "greeting",
  "explanation",
  "clarification",
  "qna",
  "signoff"
] as const;

/** Represents a single line of dialogue in the script */
export interface ScriptLine {
  /** Line sequence number (1-indexed) */
  index: number;
  /** Speaker for this line */
  speaker: SpeakerName;
  /** Spoken text content */
  text: string;
  /** Script section this line belongs to */
  section: ScriptSection;
}

/** Generation parameters for reproducibility */
export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  promptVersion: string;
}

/** Section breakdown with line indices */
export interface ScriptSections {
  greeting: number[];
  explanation: number[];
  clarification: number[];
  qna: number[];
  signoff: number[];
}

/** Represents the complete generated conversation */
export interface Script {
  /** Unique identifier (based on article + timestamp) */
  id: string;
  /** Reference to source article */
  articleTitle: string;
  articleUrl: string;
  /** Ordered list of dialogue lines */
  lines: ScriptLine[];
  /** Section breakdown for validation */
  sections: ScriptSections;
  /** Total word count of all dialogue */
  totalWords: number;
  /** Estimated duration in seconds (based on 150 WPM) */
  estimatedDuration: number;
  /** ISO 8601 timestamp of generation */
  generatedAt: string;
  /** AI model used for generation */
  model: string;
  /** Generation parameters for reproducibility */
  generationParams: GenerationParams;
}

// =============================================================================
// Audio Types
// =============================================================================

/** Represents a single TTS-generated audio clip */
export interface AudioSegment {
  /** Line index this segment corresponds to */
  lineIndex: number;
  /** Speaker who voiced this segment */
  speaker: SpeakerName;
  /** Path to temporary audio file */
  filePath: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Audio format */
  format: "mp3";
  /** Generation timestamp */
  generatedAt: string;
}

/** Audio specifications for the final output */
export interface AudioSpec {
  format: "mp3";
  bitrate: "128k";
  sampleRate: 44100;
  channels: 1; // Mono
}

/** Voice mapping for speakers */
export interface VoiceMapping {
  Nishi: string;
  Shyam: string;
}

/** Represents the final audio output */
export interface Podcast {
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
  audioSpec: AudioSpec;
  /** Voice mapping used */
  voiceMapping: VoiceMapping;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** Generation pipeline version */
  pipelineVersion: string;
}

// =============================================================================
// Generation Pipeline Types
// =============================================================================

/** Generation stage names */
export type GenerationStageName = 
  | "fetch" 
  | "generate_script" 
  | "synthesize_audio" 
  | "stitch_audio";

/** Generation stage status */
export type GenerationStageStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "failed";

/** Represents a single stage in the generation pipeline */
export interface GenerationStage {
  name: GenerationStageName;
  status: GenerationStageStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/** Source article information in metadata */
export interface MetadataSource {
  title: string;
  url: string;
  fetchedAt: string;
}

/** Script information in metadata */
export interface MetadataScript {
  id: string;
  generatedAt: string;
  model: string;
  promptVersion: string;
  temperature: number;
}

/** Audio information in metadata */
export interface MetadataAudio {
  id: string;
  createdAt: string;
  durationSeconds: number;
  voiceMapping: Record<string, string>;
}

/** Pipeline execution information */
export interface MetadataPipeline {
  version: string;
  startedAt: string;
  completedAt: string;
  stages: GenerationStage[];
}

/** Output artifacts paths */
export interface MetadataArtifacts {
  scriptPath: string;
  audioPath: string;
  metadataPath: string;
}

/** Represents traceability information for each generation run */
export interface GenerationMetadata {
  /** Unique generation ID */
  id: string;
  /** Source article information */
  source: MetadataSource;
  /** Script generation details */
  script: MetadataScript;
  /** Audio generation details */
  audio: MetadataAudio;
  /** Pipeline execution */
  pipeline: MetadataPipeline;
  /** Output artifacts */
  artifacts: MetadataArtifacts;
}

// =============================================================================
// API Types
// =============================================================================

/** Input type for podcast generation */
export type PodcastInputType = "url" | "title";

/** Request body for POST /api/podcast */
export interface PodcastRequest {
  /** Wikipedia URL or article title */
  input: string;
  /** Type of input provided */
  type?: PodcastInputType;
}

/** Response for successful podcast generation */
export interface PodcastResponse {
  /** Unique podcast identifier */
  id: string;
  /** URL to download/stream the audio */
  audioUrl: string;
  /** URL to retrieve the script */
  scriptUrl: string;
  /** Audio duration in seconds */
  durationSeconds: number;
  /** Source article info */
  article: {
    title: string;
    url: string;
  };
  /** Speakers in the podcast */
  speakers: SpeakerName[];
  /** Creation timestamp */
  createdAt: string;
}

/** Error codes for API responses */
export type ErrorCode =
  | "INVALID_INPUT"
  | "ARTICLE_NOT_FOUND"
  | "ARTICLE_TOO_SHORT"
  | "UNSUPPORTED_LANGUAGE"
  | "GENERATION_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** Error response structure */
export interface ErrorResponse {
  error: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Progress event for SSE streaming */
export interface ProgressEvent {
  stage: GenerationStageName;
  status: GenerationStageStatus;
  message: string;
  progress?: number;
}

/** Health check response */
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  version: string;
  uptime: number;
  checks: {
    ffmpeg: "ok" | "error";
    outputDir: "ok" | "error";
  };
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum article length in characters */
export const MIN_ARTICLE_LENGTH = 500;

/** Maximum article length in characters (will be truncated) */
export const MAX_ARTICLE_LENGTH = 50000;

/** Target podcast duration range in seconds */
export const PODCAST_DURATION = {
  min: 120,
  max: 180,
} as const;

/** Words per minute for duration estimation */
export const WORDS_PER_MINUTE = 150;

/** Pipeline version for traceability */
export const PIPELINE_VERSION = "1.0.0";

