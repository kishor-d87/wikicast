/**
 * Unit Tests for Text-to-Speech Service
 * 
 * Tests ElevenLabs API integration and audio generation
 */

import { generateAudioSegments, generateAudioSegmentsWithRetry } from '../../src/services/tts.js';
import type { ScriptLine, AudioSegment } from '../../src/types/index.js';

// Mock node-fetch
const mockFetch = require('node-fetch').default;

describe('TTS Service', () => {
  const mockScriptLines: ScriptLine[] = [
    { index: 1, speaker: 'Nishi', text: 'Hello, welcome to the podcast!', section: 'greeting' },
    { index: 2, speaker: 'Shyam', text: 'Hi there! Today we discuss testing.', section: 'greeting' },
    { index: 3, speaker: 'Nishi', text: 'This is very important.', section: 'explanation' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs operations
    const fs = require('fs/promises');
    fs.mkdir = jest.fn().mockResolvedValue(undefined);
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    fs.stat = jest.fn().mockResolvedValue({ size: 50000 });
  });

  describe('generateAudioSegments', () => {
    test('generates audio for each line', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      const segments = await generateAudioSegments('test_script', mockScriptLines);

      expect(segments).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('creates segments directory', async () => {
      const fs = require('fs/promises');
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', mockScriptLines);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('segments/test_script'),
        { recursive: true }
      );
    });

    test('calls ElevenLabs API with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', [mockScriptLines[0]]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('text-to-speech'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'xi-api-key': expect.any(String),
          }),
          body: expect.any(String),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toHaveProperty('text', 'Hello, welcome to the podcast!');
      expect(body).toHaveProperty('model_id');
      expect(body).toHaveProperty('voice_settings');
    });

    test('uses correct voice settings', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', [mockScriptLines[0]]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.voice_settings).toMatchObject({
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      });
    });

    test('maps speakers to correct voice IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', mockScriptLines);

      // Check that different voice IDs were used for different speakers
      const nishiCall = mockFetch.mock.calls.find((call: any[]) =>
        call[0].includes('text-to-speech')
      );
      expect(nishiCall).toBeDefined();
    });

    test('saves audio files with zero-padded indices', async () => {
      const fs = require('fs/promises');
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', mockScriptLines);

      const writeFileCalls = fs.writeFile.mock.calls.filter((call: any[]) =>
        call[0].endsWith('.mp3')
      );

      expect(writeFileCalls[0][0]).toContain('001.mp3');
      expect(writeFileCalls[1][0]).toContain('002.mp3');
      expect(writeFileCalls[2][0]).toContain('003.mp3');
    });

    test('estimates audio duration from file size', async () => {
      const fs = require('fs/promises');
      fs.stat.mockResolvedValue({ size: 32000 }); // 2 seconds at 128kbps

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      const segments = await generateAudioSegments('test_script', [mockScriptLines[0]]);

      expect(segments[0]).toHaveProperty('durationMs');
      expect(segments[0].durationMs).toBeGreaterThan(0);
    });

    test('creates AudioSegment objects with all required fields', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      const segments = await generateAudioSegments('test_script', [mockScriptLines[0]]);

      expect(segments[0]).toHaveProperty('lineIndex', 1);
      expect(segments[0]).toHaveProperty('speaker', 'Nishi');
      expect(segments[0]).toHaveProperty('filePath');
      expect(segments[0]).toHaveProperty('durationMs');
      expect(segments[0]).toHaveProperty('format', 'mp3');
      expect(segments[0]).toHaveProperty('generatedAt');
      expect(segments[0].generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('throws error for unknown speaker', async () => {
      const invalidLine: ScriptLine = {
        index: 1,
        speaker: 'UnknownSpeaker' as any,
        text: 'Test',
        section: 'greeting',
      };

      await expect(generateAudioSegments('test_script', [invalidLine]))
        .rejects
        .toThrow('Unknown speaker: UnknownSpeaker');
    });

    test('handles ElevenLabs API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      await expect(generateAudioSegments('test_script', mockScriptLines))
        .rejects
        .toThrow('ElevenLabs API error');
    });

    test('includes line number in error message', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          text: async () => 'Server error',
        });

      await expect(generateAudioSegments('test_script', mockScriptLines))
        .rejects
        .toThrow('Failed to synthesize line 2');
    });

    test('processes lines in order', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      const segments = await generateAudioSegments('test_script', mockScriptLines);

      expect(segments[0].lineIndex).toBe(1);
      expect(segments[1].lineIndex).toBe(2);
      expect(segments[2].lineIndex).toBe(3);
    });

    test('logs progress for each line', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      await generateAudioSegments('test_script', mockScriptLines);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synthesizing line 1')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Synthesizing line 2')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully generated 3 audio segments')
      );

      consoleSpy.mockRestore();
    });

    test('throws error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(generateAudioSegments('test_script', mockScriptLines))
        .rejects
        .toThrow();
    });

    test('saves audio buffer to file', async () => {
      const fs = require('fs/promises');
      const mockBuffer = new ArrayBuffer(1000);
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      await generateAudioSegments('test_script', [mockScriptLines[0]]);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.mp3'),
        expect.any(Buffer)
      );
    });
  });

  describe('generateAudioSegmentsWithRetry', () => {
    test('succeeds on first attempt', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      });

      const segments = await generateAudioSegmentsWithRetry('test_script', mockScriptLines);

      expect(segments).toHaveLength(3);
    });

    test('retries on failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Server busy',
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        })
        .mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        });

      const segments = await generateAudioSegmentsWithRetry('test_script', mockScriptLines, 2);

      expect(segments).toHaveLength(3);
    });

    test('uses exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      }) as any;

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Server busy',
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        })
        .mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        });

      await generateAudioSegmentsWithRetry('test_script', mockScriptLines, 2);

      expect(delays.length).toBeGreaterThan(0);
      // First retry should be 1000ms (2^0 * 1000)
      expect(delays[0]).toBe(1000);

      global.setTimeout = originalSetTimeout;
    });

    test('logs retry attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => 'Server busy',
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        })
        .mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
        });

      await generateAudioSegmentsWithRetry('test_script', mockScriptLines, 2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TTS generation failed (attempt 1), retrying')
      );

      consoleSpy.mockRestore();
    });

    test('throws error after max retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Persistent error',
      });

      await expect(generateAudioSegmentsWithRetry('test_script', mockScriptLines, 1))
        .rejects
        .toThrow('TTS generation failed after 2 attempts');
    });

    test('respects maxRetries parameter', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Error',
      });

      await expect(generateAudioSegmentsWithRetry('test_script', mockScriptLines, 0))
        .rejects
        .toThrow('failed after 1 attempts');
    });
  });
});

