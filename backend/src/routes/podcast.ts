import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { generatePodcast, loadPodcast, loadScript } from '../services/podcastOrchestrator.js';
import { validateInput } from '../utils/validation.js';
import { AppError } from '../utils/errors.js';
import { GenerationStage } from '../types/index.js';

const router = Router();

/**
 * POST /api/podcast/stream
 * Generate a podcast with real-time progress updates via Server-Sent Events (SSE)
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { input, type } = req.body;
    
    // Validate input
    const validation = validateInput(input, type);
    if (!validation.valid) {
      // Send error event for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ 
        error: 'INVALID_INPUT', 
        message: validation.error || 'Invalid input' 
      })}\n\n`);
      res.end();
      return;
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    console.log(`Streaming podcast generation for: ${input} (type: ${type || 'auto'})`);
    
    // Progress callback to send SSE events
    const onProgress = (stage: GenerationStage) => {
      const progressEvent = {
        stage: stage.name,
        status: stage.status,
        message: getStageMessage(stage),
      };
      
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
    };
    
    try {
      // Generate podcast with progress tracking
      const podcast = await generatePodcast(input, type, onProgress);
      
      // Send completion event
      const completeEvent = {
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
      
      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
      res.end();
    } catch (error) {
      // Send error event
      let errorCode = 'GENERATION_FAILED';
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof AppError) {
        errorCode = error.code;
        errorMessage = error.message;
      } else if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Article not found')) {
          errorCode = 'ARTICLE_NOT_FOUND';
        } else if (error.message.includes('too short')) {
          errorCode = 'ARTICLE_TOO_SHORT';
        } else if (error.message.includes('Wikipedia') || error.message.includes('unavailable')) {
          errorCode = 'SERVICE_UNAVAILABLE';
        }
      }
      
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: errorCode, message: errorMessage })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('SSE endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to start generation stream',
      });
    }
  }
});

/**
 * Helper function to get human-readable stage messages
 */
function getStageMessage(stage: GenerationStage): string {
  const messages: Record<string, Record<string, string>> = {
    fetch: {
      in_progress: 'Fetching Wikipedia article...',
      completed: 'Article fetched successfully',
      failed: 'Failed to fetch article',
    },
    generate_script: {
      in_progress: 'Writing script...',
      completed: 'Script generated',
      failed: 'Failed to generate script',
    },
    synthesize_audio: {
      in_progress: 'Generating voices...',
      completed: 'Audio synthesized',
      failed: 'Failed to synthesize audio',
    },
    stitch_audio: {
      in_progress: 'Finalizing podcast...',
      completed: 'Podcast complete',
      failed: 'Failed to finalize podcast',
    },
  };
  
  return messages[stage.name]?.[stage.status] || `${stage.status}: ${stage.name}`;
}

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

