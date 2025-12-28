import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { generatePodcast, loadPodcast, loadScript } from '../services/podcastOrchestrator.js';
import { validateInput } from '../utils/validation.js';
import { AppError } from '../utils/errors.js';

const router = Router();

/**
 * POST /api/podcast
 * Generate a podcast from Wikipedia URL or title
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { input, type } = req.body;
    
    // Validate input
    const validation = validateInput(input, type);
    if (!validation.valid) {
      throw new AppError('INVALID_INPUT', validation.error || 'Invalid input', 400);
    }
    
    console.log(`Generating podcast for: ${input} (type: ${type || 'auto'})`);
    
    // Generate podcast
    const podcast = await generatePodcast(input, type);
    
    // Build response
    const response = {
      id: podcast.id,
      audioUrl: `/api/podcast/${podcast.id}/audio`,
      scriptUrl: `/api/podcast/${podcast.id}/script`,
      durationSeconds: podcast.durationSeconds,
      article: {
        title: podcast.articleTitle,
        url: podcast.articleUrl,
      },
      speakers: ['Nishi', 'Shyam'],
      createdAt: podcast.createdAt,
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        details: error.details,
      });
    } else if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('not found') || error.message.includes('Article not found')) {
        res.status(404).json({
          error: 'ARTICLE_NOT_FOUND',
          message: error.message,
        });
      } else if (error.message.includes('too short')) {
        res.status(400).json({
          error: 'ARTICLE_TOO_SHORT',
          message: error.message,
        });
      } else if (error.message.includes('Wikipedia') || error.message.includes('unavailable')) {
        res.status(503).json({
          error: 'SERVICE_UNAVAILABLE',
          message: error.message,
        });
      } else {
        console.error('Generation error:', error);
        res.status(500).json({
          error: 'GENERATION_FAILED',
          message: error.message,
        });
      }
    } else {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unknown error occurred',
      });
    }
  }
});

/**
 * GET /api/podcast/:id
 * Get podcast metadata
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const podcast = await loadPodcast(id);
    
    if (!podcast) {
      res.status(404).json({
        error: 'PODCAST_NOT_FOUND',
        message: `Podcast with id "${id}" not found`,
      });
      return;
    }
    
    // Get file stats for size
    const stats = await fs.stat(podcast.audioFilePath);
    
    const response = {
      id: podcast.id,
      article: {
        title: podcast.articleTitle,
        url: podcast.articleUrl,
      },
      audio: {
        durationSeconds: podcast.durationSeconds,
        fileSizeBytes: stats.size,
        format: podcast.audioSpec.format,
      },
      voiceMapping: podcast.voiceMapping,
      createdAt: podcast.createdAt,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error loading podcast metadata:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to load podcast metadata',
    });
  }
});

/**
 * GET /api/podcast/:id/audio
 * Download podcast audio file
 */
router.get('/:id/audio', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const podcast = await loadPodcast(id);
    if (!podcast) {
      res.status(404).json({
        error: 'PODCAST_NOT_FOUND',
        message: `Podcast with id "${id}" not found`,
      });
      return;
    }
    
    // Check if file exists
    try {
      await fs.access(podcast.audioFilePath);
    } catch {
      res.status(404).json({
        error: 'AUDIO_FILE_NOT_FOUND',
        message: 'Audio file not found on server',
      });
      return;
    }
    
    // Get file stats
    const stats = await fs.stat(podcast.audioFilePath);
    const filename = path.basename(podcast.audioFilePath);
    
    // Set headers for audio download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Stream the file
    const fileStream = await fs.readFile(podcast.audioFilePath);
    res.send(fileStream);
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to serve audio file',
    });
  }
});

/**
 * GET /api/podcast/:id/script
 * Get podcast script
 */
router.get('/:id/script', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const script = await loadScript(id);
    if (!script) {
      res.status(404).json({
        error: 'SCRIPT_NOT_FOUND',
        message: `Script with id "${id}" not found`,
      });
      return;
    }
    
    res.json(script);
  } catch (error) {
    console.error('Error loading script:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to load script',
    });
  }
});

export default router;

