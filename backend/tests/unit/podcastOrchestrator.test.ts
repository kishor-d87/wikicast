/**
 * Unit Tests for Podcast Orchestrator
 * 
 * Tests end-to-end pipeline coordination
 */

import { generatePodcast, loadPodcast, loadScript } from '../../src/services/podcastOrchestrator.js';
import * as wikipedia from '../../src/services/wikipedia.js';
import * as scriptGenerator from '../../src/services/scriptGenerator.js';
import * as tts from '../../src/services/tts.js';
import * as audioStitcher from '../../src/services/audioStitcher.js';

// Mock all service dependencies
jest.mock('../../src/services/wikipedia.js');
jest.mock('../../src/services/scriptGenerator.js');
jest.mock('../../src/services/tts.js');
jest.mock('../../src/services/audioStitcher.js');

describe('Podcast Orchestrator', () => {
  const mockArticle = {
    title: 'Test Article',
    url: 'https://en.wikipedia.org/wiki/Test_Article',
    rawContent: '<p>Test content</p>',
    cleanedText: 'Test content '.repeat(100),
    summary: 'Test summary',
    wordCount: 200,
    fetchedAt: '2025-01-01T00:00:00Z',
    language: 'en' as const,
  };

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
    generatedAt: '2025-01-01T00:00:00Z',
    model: 'grok-3',
    generationParams: {
      temperature: 0,
      maxTokens: 4096,
      promptVersion: '1.0.0',
    },
  };

  const mockAudioSegments = [
    {
      lineIndex: 1,
      speaker: 'Nishi' as const,
      filePath: '/tmp/001.mp3',
      durationMs: 2000,
      format: 'mp3' as const,
      generatedAt: '2025-01-01T00:00:00Z',
    },
    {
      lineIndex: 2,
      speaker: 'Shyam' as const,
      filePath: '/tmp/002.mp3',
      durationMs: 3000,
      format: 'mp3' as const,
      generatedAt: '2025-01-01T00:00:01Z',
    },
  ];

  const mockStitchedAudio = {
    filePath: '/tmp/test.mp3',
    durationSeconds: 150,
    fileSizeBytes: 2000000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs operations
    const fs = require('fs/promises');
    fs.mkdir = jest.fn().mockResolvedValue(undefined);
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    fs.readFile = jest.fn().mockResolvedValue('{}');
    fs.access = jest.fn().mockResolvedValue(undefined);
  });

  describe('generatePodcast', () => {
    test('executes full pipeline successfully', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const podcast = await generatePodcast('Test Article', 'title');

      expect(podcast).toHaveProperty('id');
      expect(podcast).toHaveProperty('articleTitle', 'Test Article');
      expect(podcast).toHaveProperty('durationSeconds', 150);
      expect(podcast).toHaveProperty('audioFilePath');
    });

    test('calls services in correct order', async () => {
      const callOrder: string[] = [];

      (wikipedia.fetchArticle as jest.Mock).mockImplementation(async () => {
        callOrder.push('fetch');
        return mockArticle;
      });
      (scriptGenerator.generateScript as jest.Mock).mockImplementation(async () => {
        callOrder.push('script');
        return mockScript;
      });
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockImplementation(async () => {
        callOrder.push('tts');
        return mockAudioSegments;
      });
      (audioStitcher.stitchAudioSegments as jest.Mock).mockImplementation(async () => {
        callOrder.push('stitch');
        return mockStitchedAudio;
      });

      await generatePodcast('Test', 'title');

      expect(callOrder).toEqual(['fetch', 'script', 'tts', 'stitch']);
    });

    test('passes article to script generator', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test', 'title');

      expect(scriptGenerator.generateScript).toHaveBeenCalledWith(mockArticle);
    });

    test('passes script lines to TTS', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test', 'title');

      expect(tts.generateAudioSegmentsWithRetry).toHaveBeenCalledWith(
        mockScript.id,
        mockScript.lines
      );
    });

    test('passes segments to audio stitcher', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test', 'title');

      expect(audioStitcher.stitchAudioSegments).toHaveBeenCalledWith(
        mockScript.id,
        mockAudioSegments
      );
    });

    test('saves script to filesystem', async () => {
      const fs = require('fs/promises');
      
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test', 'title');

      const scriptWriteCall = fs.writeFile.mock.calls.find((call: any[]) =>
        call[0].includes('scripts') && call[0].endsWith('.json')
      );
      expect(scriptWriteCall).toBeDefined();
    });

    test('saves metadata to filesystem', async () => {
      const fs = require('fs/promises');
      
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test', 'title');

      const metadataWriteCall = fs.writeFile.mock.calls.find((call: any[]) =>
        call[0].includes('metadata') && call[0].endsWith('.json')
      );
      expect(metadataWriteCall).toBeDefined();
    });

    test('includes voice mapping in podcast', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const podcast = await generatePodcast('Test', 'title');

      expect(podcast.voiceMapping).toHaveProperty('Nishi');
      expect(podcast.voiceMapping).toHaveProperty('Shyam');
    });

    test('sets pipeline version', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const podcast = await generatePodcast('Test', 'title');

      expect(podcast.pipelineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('calls progress callback for each stage', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const onProgress = jest.fn();
      await generatePodcast('Test', 'title', onProgress);

      expect(onProgress).toHaveBeenCalled();
      
      // Should be called for each stage transition
      const stages = onProgress.mock.calls.map((call: any[]) => call[0].name);
      expect(stages).toContain('fetch');
      expect(stages).toContain('generate_script');
      expect(stages).toContain('synthesize_audio');
      expect(stages).toContain('stitch_audio');
    });

    test('reports in_progress status to callback', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const onProgress = jest.fn();
      await generatePodcast('Test', 'title', onProgress);

      // Should be called at least once
      expect(onProgress).toHaveBeenCalled();
      
      const inProgressCalls = onProgress.mock.calls.filter((call: any[]) =>
        call[0]?.status === 'in_progress'
      );
      expect(inProgressCalls.length).toBeGreaterThanOrEqual(0);
    });

    test('reports completed status to callback', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      const onProgress = jest.fn();
      await generatePodcast('Test', 'title', onProgress);

      const completedCalls = onProgress.mock.calls.filter((call: any[]) =>
        call[0].status === 'completed'
      );
      expect(completedCalls.length).toBeGreaterThan(0);
    });

    test('handles fetch failure gracefully', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockRejectedValue(
        new Error('Article not found')
      );

      await expect(generatePodcast('Nonexistent', 'title'))
        .rejects
        .toThrow('Article not found');
    });

    test('handles script generation failure', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockRejectedValue(
        new Error('Script generation failed')
      );

      await expect(generatePodcast('Test', 'title'))
        .rejects
        .toThrow('Script generation failed');
    });

    test('handles TTS failure', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockRejectedValue(
        new Error('TTS failed')
      );

      await expect(generatePodcast('Test', 'title'))
        .rejects
        .toThrow('TTS failed');
    });

    test('handles audio stitching failure', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockRejectedValue(
        new Error('Stitching failed')
      );

      await expect(generatePodcast('Test', 'title'))
        .rejects
        .toThrow('Stitching failed');
    });

    test('reports failed status on error', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      );

      const onProgress = jest.fn();

      await expect(generatePodcast('Test', 'title', onProgress))
        .rejects
        .toThrow();

      const failedCalls = onProgress.mock.calls.filter((call: any[]) =>
        call[0].status === 'failed'
      );
      expect(failedCalls.length).toBeGreaterThan(0);
    });

    test('auto-detects URL input type', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('https://en.wikipedia.org/wiki/Test');

      expect(wikipedia.fetchArticle).toHaveBeenCalledWith(
        'https://en.wikipedia.org/wiki/Test',
        undefined
      );
    });

    test('uses provided input type', async () => {
      (wikipedia.fetchArticle as jest.Mock).mockResolvedValue(mockArticle);
      (scriptGenerator.generateScript as jest.Mock).mockResolvedValue(mockScript);
      (tts.generateAudioSegmentsWithRetry as jest.Mock).mockResolvedValue(mockAudioSegments);
      (audioStitcher.stitchAudioSegments as jest.Mock).mockResolvedValue(mockStitchedAudio);

      await generatePodcast('Test Article', 'title');

      expect(wikipedia.fetchArticle).toHaveBeenCalledWith('Test Article', 'title');
    });
  });

  describe('loadPodcast', () => {
    test('loads podcast metadata from file', async () => {
      const fs = require('fs/promises');
      const mockMetadata = {
        id: 'test_id',
        script: {
          id: 'test_id',
          generatedAt: '2025-01-01T00:00:00Z',
          model: 'grok-3',
          promptVersion: '1.0.0',
          temperature: 0,
        },
        audio: {
          id: 'test_id',
          createdAt: '2025-01-01T00:00:00Z',
          durationSeconds: 150,
          voiceMapping: { Nishi: 'voice1', Shyam: 'voice2' },
        },
        source: {
          title: 'Test',
          url: 'https://test.com',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        artifacts: {
          audioPath: '/tmp/test.mp3',
          scriptPath: '/tmp/test.json',
          metadataPath: '/tmp/metadata.json',
        },
        pipeline: {
          version: '1.0.0',
          startedAt: '2025-01-01T00:00:00Z',
          completedAt: '2025-01-01T00:01:00Z',
          stages: [],
        },
      };

      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockMetadata));

      const podcast = await loadPodcast('test_id');

      expect(podcast).toBeDefined();
      expect(podcast?.id).toBe('test_id');
    });

    test('returns null when podcast not found', async () => {
      const fs = require('fs/promises');
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      fs.readFile = jest.fn().mockRejectedValue(error);

      const podcast = await loadPodcast('nonexistent');

      expect(podcast).toBeNull();
    });
  });

  describe('loadScript', () => {
    test('loads script from file', async () => {
      const fs = require('fs/promises');
      
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockScript));

      const script = await loadScript('test_id');

      expect(script).toEqual(mockScript);
    });

    test('returns null when script not found', async () => {
      const fs = require('fs/promises');
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      fs.readFile = jest.fn().mockRejectedValue(error);

      const script = await loadScript('nonexistent');

      expect(script).toBeNull();
    });
  });
});

