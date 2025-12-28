/**
 * Speaker Configuration
 * 
 * Fixed speaker configuration per Constitution III (Speaker Discipline).
 * Exactly two speakers: Nishi and Shyam with consistent voice mapping.
 */

import type { Speaker, SpeakerName, VoiceMapping } from '../types/index.js';

/**
 * Speaker definitions with ElevenLabs voice IDs
 * 
 * Voice IDs are fixed and not user-configurable per constitution.
 * These map to high-quality conversational voices suitable for podcast format.
 */
export const SPEAKERS: Record<SpeakerName, Speaker> = {
  Nishi: {
    name: "Nishi",
    voiceId: "7wlfJf72PCt9FjPj0Beg",
    displayName: "Nishi"
  },
  Shyam: {
    name: "Shyam",
    voiceId: "QZlSvAAnrDxLbn7n3NqM",
    displayName: "Shyam"
  }
} as const;

/**
 * Valid speaker names for validation
 */
export const VALID_SPEAKERS: readonly SpeakerName[] = ["Nishi", "Shyam"] as const;

/**
 * Get voice mapping for TTS service
 */
export function getVoiceMapping(): VoiceMapping {
  return {
    Nishi: SPEAKERS.Nishi.voiceId,
    Shyam: SPEAKERS.Shyam.voiceId
  };
}

/**
 * Get speaker by name
 */
export function getSpeaker(name: SpeakerName): Speaker {
  return SPEAKERS[name];
}

/**
 * Check if a name is a valid speaker
 */
export function isValidSpeaker(name: string): name is SpeakerName {
  return VALID_SPEAKERS.includes(name as SpeakerName);
}

/**
 * Get voice ID for a speaker
 */
export function getVoiceId(speaker: SpeakerName): string {
  return SPEAKERS[speaker].voiceId;
}

