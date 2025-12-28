import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AudioSegment } from '../types/index.js';
import { getConfig } from '../config/env.js';

const execAsync = promisify(exec);

/**
 * Audio Stitcher Service
 * 
 * Concatenates audio segments using FFmpeg and applies normalization.
 * Outputs final MP3 file at 128kbps.
 */

/**
 * Ensures the audio output directory exists
 */
async function ensureAudioDirectory(): Promise<string> {
  const config = getConfig();
  const audioDir = path.join(config.outputDir, 'audio');
  
  try {
    await fs.mkdir(audioDir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create audio directory: ${error}`);
  }
  
  return audioDir;
}

/**
 * Creates a file list for FFmpeg concat demuxer
 */
async function createConcatFile(segments: AudioSegment[], tempDir: string): Promise<string> {
  const concatFilePath = path.join(tempDir, 'concat_list.txt');
  
  // Sort segments by line index
  const sortedSegments = [...segments].sort((a, b) => a.lineIndex - b.lineIndex);
  
  // Create concat file content
  const fileList = sortedSegments
    .map(segment => `file '${segment.filePath}'`)
    .join('\n');
  
  await fs.writeFile(concatFilePath, fileList, 'utf-8');
  
  return concatFilePath;
}

/**
 * Checks if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the actual duration of an MP3 file using FFprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.warn(`Failed to get duration for ${filePath}:`, error);
    return 0;
  }
}

/**
 * Stitches audio segments into a single MP3 file
 */
export async function stitchAudioSegments(
  scriptId: string,
  segments: AudioSegment[]
): Promise<{ filePath: string; durationSeconds: number; fileSizeBytes: number }> {
  // Validate segments
  if (segments.length === 0) {
    throw new Error('No audio segments to stitch');
  }
  
  console.log(`Stitching ${segments.length} audio segments...`);
  
  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not available. Please install FFmpeg to process audio.');
  }
  
  // Prepare output directory
  const audioDir = await ensureAudioDirectory();
  const outputPath = path.join(audioDir, `${scriptId}.mp3`);
  
  // Create temporary directory for concat file
  const config = getConfig();
  const tempDir = path.join(config.outputDir, 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    // Create concat file
    const concatFilePath = await createConcatFile(segments, tempDir);
    
    // FFmpeg command to concatenate and normalize
    // Using concat demuxer for lossless concatenation
    // Applying loudnorm filter for volume normalization
    const ffmpegCommand = [
      'ffmpeg',
      '-f concat',
      '-safe 0',
      `-i "${concatFilePath}"`,
      '-af "loudnorm=I=-16:TP=-1.5:LRA=11"',
      '-codec:a libmp3lame',
      '-b:a 128k',
      '-ar 44100',
      '-ac 1', // Mono
      '-y', // Overwrite output file
      `"${outputPath}"`,
    ].join(' ');
    
    console.log('Running FFmpeg command...');
    
    // Execute FFmpeg
    const { stderr } = await execAsync(ffmpegCommand);
    
    // FFmpeg outputs progress to stderr, check for errors
    if (stderr.toLowerCase().includes('error')) {
      console.error('FFmpeg stderr:', stderr);
      throw new Error('FFmpeg encountered an error during processing');
    }
    
    // Get actual duration and file size
    const durationSeconds = await getAudioDuration(outputPath);
    const stats = await fs.stat(outputPath);
    
    console.log(`Audio stitched successfully: ${outputPath}`);
    console.log(`Duration: ${durationSeconds.toFixed(2)}s, Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    
    // Clean up temp files
    try {
      await fs.unlink(concatFilePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }
    
    return {
      filePath: outputPath,
      durationSeconds: Math.round(durationSeconds),
      fileSizeBytes: stats.size,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Audio stitching failed: ${error.message}`);
    }
    throw new Error('Audio stitching failed with unknown error');
  }
}

/**
 * Alternative stitching method using simple concatenation
 * Fallback if the concat demuxer approach fails
 */
export async function stitchAudioSegmentsSimple(
  scriptId: string,
  segments: AudioSegment[]
): Promise<{ filePath: string; durationSeconds: number; fileSizeBytes: number }> {
  if (segments.length === 0) {
    throw new Error('No audio segments to stitch');
  }
  
  console.log(`Using simple concatenation for ${segments.length} segments...`);
  
  const audioDir = await ensureAudioDirectory();
  const outputPath = path.join(audioDir, `${scriptId}.mp3`);
  
  // Sort segments
  const sortedSegments = [...segments].sort((a, b) => a.lineIndex - b.lineIndex);
  
  // Build input list
  const inputList = sortedSegments.map(s => `-i "${s.filePath}"`).join(' ');
  const filterComplex = sortedSegments.map((_, i) => `[${i}:a]`).join('') + 
                        `concat=n=${sortedSegments.length}:v=0:a=1[outa]`;
  
  const ffmpegCommand = [
    'ffmpeg',
    inputList,
    `-filter_complex "${filterComplex}"`,
    '-map "[outa]"',
    '-codec:a libmp3lame',
    '-b:a 128k',
    '-ar 44100',
    '-y',
    `"${outputPath}"`,
  ].join(' ');
  
  await execAsync(ffmpegCommand);
  
  const durationSeconds = await getAudioDuration(outputPath);
  const stats = await fs.stat(outputPath);
  
  return {
    filePath: outputPath,
    durationSeconds: Math.round(durationSeconds),
    fileSizeBytes: stats.size,
  };
}

