import { promises as fs } from 'fs';
import path from 'path';
import { Podcast, GenerationMetadata, GenerationStage } from '../types/index.js';
import { getConfig } from '../config/env.js';
import { SPEAKERS } from '../config/speakers.js';
import { fetchArticle } from './wikipedia.js';
import { generateScript } from './scriptGenerator.js';
import { generateAudioSegmentsWithRetry } from './tts.js';
import { stitchAudioSegments } from './audioStitcher.js';

/**
 * Podcast Orchestrator
 * 
 * Coordinates the end-to-end podcast generation pipeline:
 * 1. Fetch Wikipedia article
 * 2. Generate conversational script
 * 3. Synthesize audio segments
 * 4. Stitch segments into final MP3
 * 5. Save all artifacts
 */

export type ProgressCallback = (stage: GenerationStage) => void;

const PIPELINE_VERSION = '1.0.0';

/**
 * Ensures metadata directory exists
 */
async function ensureMetadataDirectory(): Promise<string> {
  const config = getConfig();
  const metadataDir = path.join(config.outputDir, 'metadata');
  
  await fs.mkdir(metadataDir, { recursive: true });
  
  return metadataDir;
}

/**
 * Ensures scripts directory exists
 */
async function ensureScriptsDirectory(): Promise<string> {
  const config = getConfig();
  const scriptsDir = path.join(config.outputDir, 'scripts');
  
  await fs.mkdir(scriptsDir, { recursive: true });
  
  return scriptsDir;
}

/**
 * Saves script as JSON file
 */
async function saveScript(scriptId: string, script: any): Promise<string> {
  const scriptsDir = await ensureScriptsDirectory();
  const scriptPath = path.join(scriptsDir, `${scriptId}.json`);
  
  await fs.writeFile(scriptPath, JSON.stringify(script, null, 2), 'utf-8');
  
  return scriptPath;
}

/**
 * Saves generation metadata
 */
async function saveMetadata(metadata: GenerationMetadata): Promise<string> {
  const metadataDir = await ensureMetadataDirectory();
  const metadataPath = path.join(metadataDir, `${metadata.id}.json`);
  
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  return metadataPath;
}

/**
 * Creates a generation stage object
 */
function createStage(
  name: GenerationStage['name'],
  status: GenerationStage['status'] = 'pending'
): GenerationStage {
  return { name, status };
}

/**
 * Main orchestration function
 */
export async function generatePodcast(
  input: string,
  type?: 'url' | 'title',
  onProgress?: ProgressCallback
): Promise<Podcast> {
  const stages: GenerationStage[] = [
    createStage('fetch'),
    createStage('generate_script'),
    createStage('synthesize_audio'),
    createStage('stitch_audio'),
  ];
  
  const startTime = new Date().toISOString();
  
  try {
    // Stage 1: Fetch article
    console.log('Stage 1: Fetching Wikipedia article...');
    stages[0].status = 'in_progress';
    stages[0].startedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[0]);
    
    const article = await fetchArticle(input, type);
    
    stages[0].status = 'completed';
    stages[0].completedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[0]);
    
    console.log(`Article fetched: "${article.title}" (${article.wordCount} words)`);
    
    // Stage 2: Generate script
    console.log('Stage 2: Generating podcast script...');
    stages[1].status = 'in_progress';
    stages[1].startedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[1]);
    
    const script = await generateScript(article);
    
    stages[1].status = 'completed';
    stages[1].completedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[1]);
    
    console.log(`Script generated: ${script.lines.length} lines, ~${script.estimatedDuration}s`);
    
    // Save script
    const scriptPath = await saveScript(script.id, script);
    console.log(`Script saved: ${scriptPath}`);
    
    // Stage 3: Synthesize audio
    console.log('Stage 3: Synthesizing audio segments...');
    stages[2].status = 'in_progress';
    stages[2].startedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[2]);
    
    const audioSegments = await generateAudioSegmentsWithRetry(script.id, script.lines);
    
    stages[2].status = 'completed';
    stages[2].completedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[2]);
    
    console.log(`Audio segments synthesized: ${audioSegments.length} segments`);
    
    // Stage 4: Stitch audio
    console.log('Stage 4: Stitching audio segments...');
    stages[3].status = 'in_progress';
    stages[3].startedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[3]);
    
    const audioResult = await stitchAudioSegments(script.id, audioSegments);
    
    stages[3].status = 'completed';
    stages[3].completedAt = new Date().toISOString();
    if (onProgress) onProgress(stages[3]);
    
    console.log(`Audio stitched: ${audioResult.filePath} (${audioResult.durationSeconds}s)`);
    
    // Create podcast entity
    const podcast: Podcast = {
      id: script.id,
      scriptId: script.id,
      articleTitle: article.title,
      articleUrl: article.url,
      audioFilePath: audioResult.filePath,
      durationSeconds: audioResult.durationSeconds,
      fileSizeBytes: audioResult.fileSizeBytes,
      audioSpec: {
        format: 'mp3',
        bitrate: '128k',
        sampleRate: 44100,
        channels: 1,
      },
      voiceMapping: {
        Nishi: SPEAKERS.Nishi.voiceId,
        Shyam: SPEAKERS.Shyam.voiceId,
      },
      createdAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
    };
    
    // Create generation metadata
    const metadata: GenerationMetadata = {
      id: script.id,
      source: {
        title: article.title,
        url: article.url,
        fetchedAt: article.fetchedAt,
      },
      script: {
        id: script.id,
        generatedAt: script.generatedAt,
        model: script.model,
        promptVersion: script.generationParams.promptVersion,
        temperature: script.generationParams.temperature,
      },
      audio: {
        id: podcast.id,
        createdAt: podcast.createdAt,
        durationSeconds: podcast.durationSeconds,
        voiceMapping: {
          Nishi: podcast.voiceMapping.Nishi,
          Shyam: podcast.voiceMapping.Shyam,
        },
      },
      pipeline: {
        version: PIPELINE_VERSION,
        startedAt: startTime,
        completedAt: new Date().toISOString(),
        stages,
      },
      artifacts: {
        scriptPath,
        audioPath: audioResult.filePath,
        metadataPath: '', // Will be set after saving
      },
    };
    
    // Save metadata
    const metadataPath = await saveMetadata(metadata);
    metadata.artifacts.metadataPath = metadataPath;
    
    console.log(`Metadata saved: ${metadataPath}`);
    console.log('✅ Podcast generation complete!');
    
    return podcast;
  } catch (error) {
    // Mark current stage as failed
    const currentStage = stages.find(s => s.status === 'in_progress');
    if (currentStage) {
      currentStage.status = 'failed';
      currentStage.completedAt = new Date().toISOString();
      currentStage.error = error instanceof Error ? error.message : 'Unknown error';
      if (onProgress) onProgress(currentStage);
    }
    
    console.error('❌ Podcast generation failed:', error);
    throw error;
  }
}

/**
 * Loads a podcast by ID from saved metadata
 */
export async function loadPodcast(id: string): Promise<Podcast | null> {
  try {
    const config = getConfig();
    const metadataPath = path.join(config.outputDir, 'metadata', `${id}.json`);
    
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata: GenerationMetadata = JSON.parse(content);
    
    // Reconstruct podcast entity
    const podcast: Podcast = {
      id: metadata.id,
      scriptId: metadata.script.id,
      articleTitle: metadata.source.title,
      articleUrl: metadata.source.url,
      audioFilePath: metadata.artifacts.audioPath,
      durationSeconds: metadata.audio.durationSeconds,
      fileSizeBytes: 0, // Can be retrieved from file stats if needed
      audioSpec: {
        format: 'mp3',
        bitrate: '128k',
        sampleRate: 44100,
        channels: 1,
      },
      voiceMapping: {
        Nishi: metadata.audio.voiceMapping.Nishi,
        Shyam: metadata.audio.voiceMapping.Shyam,
      },
      createdAt: metadata.audio.createdAt,
      pipelineVersion: metadata.pipeline.version,
    };
    
    return podcast;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Loads script by ID
 */
export async function loadScript(id: string): Promise<any | null> {
  try {
    const config = getConfig();
    const scriptPath = path.join(config.outputDir, 'scripts', `${id}.json`);
    
    const content = await fs.readFile(scriptPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

