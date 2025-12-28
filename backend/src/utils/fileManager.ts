/**
 * File Manager Utility
 * 
 * Handles file operations for podcast generation artifacts.
 * Creates output directories, saves/loads JSON, and manages deterministic naming.
 * Per FR-027: All files stored on local filesystem only.
 */

import fs from 'fs/promises';
import path from 'path';
import { getConfig } from '../config/env.js';
import type { Script, GenerationMetadata } from '../types/index.js';
// Podcast type available if needed for future file operations

/**
 * Output directory structure
 */
const OUTPUT_DIRS = {
  scripts: 'scripts',
  audio: 'audio',
  segments: 'audio/segments',
  metadata: 'metadata',
} as const;

/**
 * Sanitize a string for use in filenames
 * - Lowercase
 * - Replace spaces with underscores
 * - Remove special characters except hyphens
 * - Truncate to 50 characters
 */
export function sanitizeFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 50);
}

/**
 * Generate a deterministic ID from title and timestamp
 * Format: {sanitized_title}_{timestamp}
 */
export function generateId(title: string, timestamp?: Date): string {
  const sanitized = sanitizeFilename(title);
  const ts = (timestamp || new Date())
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '_');
  return `${sanitized}_${ts}`;
}

/**
 * Get the timestamp portion from an ID
 */
export function getTimestampFromId(id: string): string {
  const parts = id.split('_');
  if (parts.length >= 2) {
    return parts[parts.length - 2] + '_' + parts[parts.length - 1];
  }
  return '';
}

/**
 * Ensure output directories exist
 */
export async function ensureOutputDirs(): Promise<void> {
  const config = getConfig();
  const baseDir = config.outputDir;
  
  await fs.mkdir(baseDir, { recursive: true });
  
  for (const dir of Object.values(OUTPUT_DIRS)) {
    const fullPath = path.join(baseDir, dir);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

/**
 * Get path for a script file
 */
export function getScriptPath(id: string): string {
  const config = getConfig();
  return path.join(config.outputDir, OUTPUT_DIRS.scripts, `${id}.json`);
}

/**
 * Get path for the final audio file
 */
export function getAudioPath(id: string): string {
  const config = getConfig();
  return path.join(config.outputDir, OUTPUT_DIRS.audio, `${id}.mp3`);
}

/**
 * Get directory for audio segments
 */
export function getSegmentsDir(id: string): string {
  const config = getConfig();
  return path.join(config.outputDir, OUTPUT_DIRS.segments, id);
}

/**
 * Get path for a specific audio segment
 */
export function getSegmentPath(id: string, index: number): string {
  const segmentDir = getSegmentsDir(id);
  return path.join(segmentDir, `${String(index).padStart(3, '0')}.mp3`);
}

/**
 * Get path for metadata file
 */
export function getMetadataPath(id: string): string {
  const config = getConfig();
  return path.join(config.outputDir, OUTPUT_DIRS.metadata, `${id}.json`);
}

/**
 * Save JSON data to a file
 */
export async function saveJson<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Load JSON data from a file
 */
export async function loadJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Save a script to the filesystem
 */
export async function saveScript(script: Script): Promise<string> {
  const filePath = getScriptPath(script.id);
  await saveJson(filePath, script);
  return filePath;
}

/**
 * Load a script from the filesystem
 */
export async function loadScript(id: string): Promise<Script | null> {
  const filePath = getScriptPath(id);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return loadJson<Script>(filePath);
}

/**
 * Save generation metadata
 */
export async function saveMetadata(metadata: GenerationMetadata): Promise<string> {
  const filePath = getMetadataPath(metadata.id);
  await saveJson(filePath, metadata);
  return filePath;
}

/**
 * Load generation metadata
 */
export async function loadMetadata(id: string): Promise<GenerationMetadata | null> {
  const filePath = getMetadataPath(id);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return loadJson<GenerationMetadata>(filePath);
}

/**
 * Save binary data (audio) to a file
 */
export async function saveBinary(filePath: string, data: Buffer): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, data);
}

/**
 * Create segments directory for a podcast
 */
export async function createSegmentsDir(id: string): Promise<string> {
  const dir = getSegmentsDir(id);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Clean up temporary segment files
 */
export async function cleanupSegments(id: string): Promise<void> {
  const dir = getSegmentsDir(id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * List all podcast IDs in the output directory
 */
export async function listPodcasts(): Promise<string[]> {
  const config = getConfig();
  const audioDir = path.join(config.outputDir, OUTPUT_DIRS.audio);
  
  try {
    const files = await fs.readdir(audioDir);
    return files
      .filter(f => f.endsWith('.mp3'))
      .map(f => f.replace('.mp3', ''));
  } catch {
    return [];
  }
}

/**
 * Check if output directory is accessible
 */
export async function checkOutputDir(): Promise<boolean> {
  try {
    await ensureOutputDirs();
    return true;
  } catch {
    return false;
  }
}

