import { promises as fs } from 'fs';
import path from 'path';
import { ScriptLine, AudioSegment } from '../types/index.js';
import { getConfig } from '../config/env.js';
import { SPEAKERS } from '../config/speakers.js';
import https from 'https';
import fetch from 'node-fetch';

/**
 * Text-to-Speech Service
 * 
 * Generates audio segments using ElevenLabs TTS API.
 * Maps speakers to their fixed voice IDs.
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Create an HTTPS agent that handles SSL certificates properly
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface ElevenLabsRequest {
  text: string;
  model_id: string;
  voice_settings: ElevenLabsVoiceSettings;
}

/**
 * Ensures the segments directory exists
 */
async function ensureSegmentsDirectory(scriptId: string): Promise<string> {
  const config = getConfig();
  const segmentsDir = path.join(config.outputDir, 'audio', 'segments', scriptId);
  
  try {
    await fs.mkdir(segmentsDir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create segments directory: ${error}`);
  }
  
  return segmentsDir;
}

/**
 * Gets audio duration from MP3 file
 * Note: This is a simple estimation based on file size
 * For production, consider using a proper audio library
 */
async function estimateAudioDuration(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    // Rough estimate: 128kbps = 16KB/s
    // Duration in milliseconds
    const durationMs = (stats.size / 16000) * 1000;
    return Math.round(durationMs);
  } catch (error) {
    console.warn(`Failed to estimate duration for ${filePath}:`, error);
    return 0;
  }
}

/**
 * Calls ElevenLabs TTS API to generate audio for a single line
 */
async function synthesizeLine(
  text: string,
  voiceId: string,
  outputPath: string
): Promise<void> {
  const config = getConfig();
  const apiUrl = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;
  
  const request: ElevenLabsRequest = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': config.elevenLabsApiKey,
      },
      body: JSON.stringify(request),
      agent: httpsAgent,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Save audio to file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(outputPath, buffer);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error calling ElevenLabs API');
  }
}

/**
 * Generates audio segments for all script lines
 */
export async function generateAudioSegments(
  scriptId: string,
  lines: ScriptLine[]
): Promise<AudioSegment[]> {
  // Create segments directory
  const segmentsDir = await ensureSegmentsDirectory(scriptId);
  
  const segments: AudioSegment[] = [];
  
  // Process each line
  for (const line of lines) {
    // Get voice ID for speaker
    const speaker = SPEAKERS[line.speaker];
    if (!speaker) {
      throw new Error(`Unknown speaker: ${line.speaker}`);
    }
    
    // Generate filename (zero-padded 3-digit index)
    const filename = `${String(line.index).padStart(3, '0')}.mp3`;
    const filePath = path.join(segmentsDir, filename);
    
    console.log(`Synthesizing line ${line.index} (${line.speaker}): "${line.text.substring(0, 50)}..."`);
    
    try {
      // Call TTS API
      await synthesizeLine(line.text, speaker.voiceId, filePath);
      
      // Estimate duration
      const durationMs = await estimateAudioDuration(filePath);
      
      // Create segment record
      const segment: AudioSegment = {
        lineIndex: line.index,
        speaker: line.speaker,
        filePath,
        durationMs,
        format: 'mp3',
        generatedAt: new Date().toISOString(),
      };
      
      segments.push(segment);
    } catch (error) {
      throw new Error(`Failed to synthesize line ${line.index}: ${error}`);
    }
  }
  
  console.log(`Successfully generated ${segments.length} audio segments`);
  
  return segments;
}

/**
 * Retry wrapper for TTS generation with exponential backoff
 */
export async function generateAudioSegmentsWithRetry(
  scriptId: string,
  lines: ScriptLine[],
  maxRetries: number = 2
): Promise<AudioSegment[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateAudioSegments(scriptId, lines);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`TTS generation failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`TTS generation failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

