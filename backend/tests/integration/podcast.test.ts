/**
 * Integration Tests for Podcast API Endpoints
 * 
 * Tests POST /api/podcast and GET /api/podcast/:id/* endpoints
 */

import request from 'supertest';
import express, { Express } from 'express';
import podcastRouter from '../../src/routes/podcast.js';
import { generatePodcast, loadPodcast, loadScript } from '../../src/services/podcastOrchestrator.js';

// Mock the podcast orchestrator
jest.mock('../../src/services/podcastOrchestrator.js');

describe('Podcast API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/podcast', podcastRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/podcast', () => {
    const mockPodcast = {
      id: 'test_article_20250101_120000',
      scriptId: 'test_article_20250101_120000',
      articleTitle: 'Test Article',
      articleUrl: 'https://en.wikipedia.org/wiki/Test_Article',
      audioFilePath: '/tmp/test.mp3',
      durationSeconds: 150,
      fileSizeBytes: 2000000,
      audioSpec: {
        format: 'mp3' as const,
        bitrate: '128k' as const,
        sampleRate: 44100,
        channels: 1,
      },
      voiceMapping: {
        Nishi: 'voice-id-1',
        Shyam: 'voice-id-2',
      },
      createdAt: '2025-01-01T12:00:00Z',
      pipelineVersion: '1.0.0',
    };

    test('generates podcast from valid URL', async () => {
      (generatePodcast as jest.Mock).mockResolvedValue(mockPodcast);

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://en.wikipedia.org/wiki/Test_Article',
          type: 'url',
        })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('audioUrl');
      expect(response.body).toHaveProperty('scriptUrl');
      expect(response.body).toHaveProperty('durationSeconds');
      expect(response.body).toHaveProperty('article');
      expect(response.body).toHaveProperty('speakers');
      expect(response.body).toHaveProperty('createdAt');

      expect(response.body.speakers).toEqual(['Nishi', 'Shyam']);
      expect(generatePodcast).toHaveBeenCalledWith(
        'https://en.wikipedia.org/wiki/Test_Article',
        'url'
      );
    });

    test('generates podcast from valid title', async () => {
      (generatePodcast as jest.Mock).mockResolvedValue(mockPodcast);

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'Albert Einstein',
          type: 'title',
        })
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(generatePodcast).toHaveBeenCalledWith('Albert Einstein', 'title');
    });

    test('auto-detects input type when not specified', async () => {
      (generatePodcast as jest.Mock).mockResolvedValue(mockPodcast);

      await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://en.wikipedia.org/wiki/Test',
        })
        .expect(200);

      expect(generatePodcast).toHaveBeenCalled();
    });

    test('returns 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: '',
          type: 'url',
        })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'INVALID_INPUT');
      expect(response.body).toHaveProperty('message');
    });

    test('returns 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://google.com',
          type: 'url',
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('returns 400 for title that is just numbers', async () => {
      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: '12345',
          type: 'title',
        })
        .expect(400);

      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('returns 404 when article not found', async () => {
      (generatePodcast as jest.Mock).mockRejectedValue(
        new Error('Article not found: "NonexistentArticle"')
      );

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'NonexistentArticle',
          type: 'title',
        })
        .expect(404);

      expect(response.body.error).toBe('ARTICLE_NOT_FOUND');
    });

    test('returns 400 when article too short', async () => {
      (generatePodcast as jest.Mock).mockRejectedValue(
        new Error('Article too short: 100 characters (minimum: 500)')
      );

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://en.wikipedia.org/wiki/Short',
          type: 'url',
        })
        .expect(400);

      expect(response.body.error).toBe('ARTICLE_TOO_SHORT');
    });

    test('returns 503 for Wikipedia service unavailable', async () => {
      (generatePodcast as jest.Mock).mockRejectedValue(
        new Error('Wikipedia API error: 503 Service Unavailable')
      );

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://en.wikipedia.org/wiki/Test',
          type: 'url',
        })
        .expect(503);

      expect(response.body.error).toBe('SERVICE_UNAVAILABLE');
    });

    test('returns 500 for generation failure', async () => {
      (generatePodcast as jest.Mock).mockRejectedValue(
        new Error('Failed to generate script')
      );

      const response = await request(app)
        .post('/api/podcast')
        .send({
          input: 'https://en.wikipedia.org/wiki/Test',
          type: 'url',
        })
        .expect(500);

      expect(response.body.error).toBe('GENERATION_FAILED');
    });
  });

  describe('GET /api/podcast/:id', () => {
    const mockPodcast = {
      id: 'test_article_20250101_120000',
      scriptId: 'test_article_20250101_120000',
      articleTitle: 'Test Article',
      articleUrl: 'https://en.wikipedia.org/wiki/Test_Article',
      audioFilePath: '/tmp/test.mp3',
      durationSeconds: 150,
      fileSizeBytes: 2000000,
      audioSpec: {
        format: 'mp3' as const,
        bitrate: '128k' as const,
        sampleRate: 44100,
        channels: 1,
      },
      voiceMapping: {
        Nishi: 'voice-id-1',
        Shyam: 'voice-id-2',
      },
      createdAt: '2025-01-01T12:00:00Z',
      pipelineVersion: '1.0.0',
    };

    test('returns podcast metadata', async () => {
      (loadPodcast as jest.Mock).mockResolvedValue(mockPodcast);

      // Mock fs.stat
      const fs = require('fs/promises');
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });

      const response = await request(app)
        .get('/api/podcast/test_article_20250101_120000')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('article');
      expect(response.body).toHaveProperty('audio');
      expect(response.body).toHaveProperty('voiceMapping');
      expect(response.body).toHaveProperty('createdAt');

      expect(response.body.audio).toHaveProperty('durationSeconds');
      expect(response.body.audio).toHaveProperty('fileSizeBytes');
      expect(response.body.audio).toHaveProperty('format');
    });

    test('returns 404 for non-existent podcast', async () => {
      (loadPodcast as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/podcast/nonexistent_id')
        .expect(404);

      expect(response.body.error).toBe('PODCAST_NOT_FOUND');
    });

    test('returns 500 for internal error', async () => {
      (loadPodcast as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/podcast/test_id')
        .expect(500);

      expect(response.body.error).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/podcast/:id/audio', () => {
    const mockPodcast = {
      id: 'test_article_20250101_120000',
      scriptId: 'test_article_20250101_120000',
      articleTitle: 'Test Article',
      articleUrl: 'https://en.wikipedia.org/wiki/Test_Article',
      audioFilePath: '/tmp/test.mp3',
      durationSeconds: 150,
      fileSizeBytes: 2000000,
      audioSpec: {
        format: 'mp3' as const,
        bitrate: '128k' as const,
        sampleRate: 44100,
        channels: 1,
      },
      voiceMapping: {
        Nishi: 'voice-id-1',
        Shyam: 'voice-id-2',
      },
      createdAt: '2025-01-01T12:00:00Z',
      pipelineVersion: '1.0.0',
    };

    test('returns 404 for non-existent podcast', async () => {
      (loadPodcast as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/podcast/nonexistent_id/audio')
        .expect(404);

      expect(response.body.error).toBe('PODCAST_NOT_FOUND');
    });

    test('returns 404 when audio file not found', async () => {
      (loadPodcast as jest.Mock).mockResolvedValue(mockPodcast);

      const fs = require('fs/promises');
      fs.access = jest.fn().mockRejectedValue(new Error('ENOENT'));

      const response = await request(app)
        .get('/api/podcast/test_id/audio')
        .expect(404);

      expect(response.body.error).toBe('AUDIO_FILE_NOT_FOUND');
    });
  });

  describe('GET /api/podcast/:id/script', () => {
    const mockScript = {
      id: 'test_article_20250101_120000',
      articleTitle: 'Test Article',
      articleUrl: 'https://en.wikipedia.org/wiki/Test_Article',
      lines: [
        { index: 1, speaker: 'Nishi' as const, text: 'Hello', section: 'greeting' as const },
        { index: 2, speaker: 'Shyam' as const, text: 'Hi', section: 'greeting' as const },
      ],
      sections: {
        greeting: [1, 2],
        explanation: [],
        clarification: [],
        qna: [],
        signoff: [],
      },
      totalWords: 50,
      estimatedDuration: 120,
      generatedAt: '2025-01-01T12:00:00Z',
      model: 'grok-3',
      generationParams: {
        temperature: 0,
        maxTokens: 4096,
        promptVersion: '1.0.0',
      },
    };

    test('returns script JSON', async () => {
      (loadScript as jest.Mock).mockResolvedValue(mockScript);

      const response = await request(app)
        .get('/api/podcast/test_article_20250101_120000/script')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('lines');
      expect(response.body).toHaveProperty('sections');
      expect(response.body).toHaveProperty('totalWords');
      expect(response.body).toHaveProperty('estimatedDuration');
    });

    test('returns 404 for non-existent script', async () => {
      (loadScript as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/podcast/nonexistent_id/script')
        .expect(404);

      expect(response.body.error).toBe('SCRIPT_NOT_FOUND');
    });

    test('returns 500 for internal error', async () => {
      (loadScript as jest.Mock).mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/api/podcast/test_id/script')
        .expect(500);

      expect(response.body.error).toBe('INTERNAL_ERROR');
    });
  });
});

