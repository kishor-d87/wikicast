/**
 * Unit Tests for Audio Stitcher Service
 * 
 * Tests audio segment concatenation and FFmpeg integration
 */

import { stitchAudioSegments, checkFFmpegAvailable } from '../../src/services/audioStitcher.js';
import { AudioSegment } from '../../src/types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

const mockExec = exec as unknown as jest.Mock;

describe('Audio Stitcher Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkFFmpegAvailable', () => {
    test('returns true when ffmpeg is available', async () => {
      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version 4.0', stderr: '' });

      const result = await checkFFmpegAvailable();
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('ffmpeg -version');
    });

    test('returns false when ffmpeg is not available', async () => {
      mockExec.mockRejectedValueOnce(new Error('Command not found'));

      const result = await checkFFmpegAvailable();
      expect(result).toBe(false);
    });

    test('returns false on any error', async () => {
      mockExec.mockRejectedValueOnce(new Error('Unknown error'));

      const result = await checkFFmpegAvailable();
      expect(result).toBe(false);
    });
  });

  describe('stitchAudioSegments', () => {
    const mockSegments: AudioSegment[] = [
      {
        lineIndex: 1,
        speaker: 'Nishi',
        filePath: '/tmp/segments/001.mp3',
        durationMs: 2000,
        format: 'mp3',
        generatedAt: '2025-01-01T12:00:00Z',
      },
      {
        lineIndex: 2,
        speaker: 'Shyam',
        filePath: '/tmp/segments/002.mp3',
        durationMs: 3000,
        format: 'mp3',
        generatedAt: '2025-01-01T12:00:01Z',
      },
      {
        lineIndex: 3,
        speaker: 'Nishi',
        filePath: '/tmp/segments/003.mp3',
        durationMs: 2500,
        format: 'mp3',
        generatedAt: '2025-01-01T12:00:02Z',
      },
    ];

    test('throws error when no segments provided', async () => {
      await expect(stitchAudioSegments('test_id', []))
        .rejects
        .toThrow('No audio segments to stitch');
    });

    test('throws error when FFmpeg not available', async () => {
      mockExec.mockRejectedValueOnce(new Error('Command not found'));

      await expect(stitchAudioSegments('test_id', mockSegments))
        .rejects
        .toThrow('FFmpeg is not available');
    });

    test('creates concat file with correct format', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      // Mock FFmpeg check (first call)
      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      // Mock FFprobe for duration (second call)  
      mockExec.mockResolvedValueOnce({ stdout: '150.5', stderr: '' });
      // Mock actual FFmpeg command (third call)
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      expect(fs.writeFile).toHaveBeenCalled();
      const concatContent = fs.writeFile.mock.calls.find((call: any[]) => 
        call[0].includes('concat_list.txt')
      );
      expect(concatContent).toBeDefined();
    });

    test('sorts segments by line index', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const unorderedSegments = [mockSegments[2], mockSegments[0], mockSegments[1]];

      await stitchAudioSegments('test_id', unorderedSegments);

      const concatCall = fs.writeFile.mock.calls.find((call: any[]) =>
        call[0].includes('concat_list.txt')
      );
      expect(concatCall).toBeDefined();
      const content = concatCall[1];
      expect(content.indexOf('001.mp3')).toBeLessThan(content.indexOf('002.mp3'));
      expect(content.indexOf('002.mp3')).toBeLessThan(content.indexOf('003.mp3'));
    });

    test('applies loudnorm filter', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      const ffmpegCall = mockExec.mock.calls.find((call: any[]) =>
        call[0].includes('loudnorm')
      );
      expect(ffmpegCall).toBeDefined();
      expect(ffmpegCall[0]).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
    });

    test('outputs MP3 at 128kbps', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      const ffmpegCall = mockExec.mock.calls.find((call: any[]) =>
        call[0].includes('-b:a 128k')
      );
      expect(ffmpegCall).toBeDefined();
    });

    test('outputs mono audio', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      const ffmpegCall = mockExec.mock.calls.find((call: any[]) =>
        call[0].includes('-ac 1')
      );
      expect(ffmpegCall).toBeDefined();
    });

    test('returns file path, duration, and size', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2500000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '145.75', stderr: '' });

      const result = await stitchAudioSegments('test_id', mockSegments);

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('durationSeconds');
      expect(result).toHaveProperty('fileSizeBytes');
      expect(result.filePath).toContain('.mp3');
      expect(result.durationSeconds).toBe(146); // Rounded from 145.75
      expect(result.fileSizeBytes).toBe(2500000);
    });

    test('throws error on FFmpeg failure', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockRejectedValueOnce(new Error('FFmpeg failed'));

      await expect(stitchAudioSegments('test_id', mockSegments))
        .rejects
        .toThrow();
    });

    test('detects FFmpeg errors in stderr', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ 
        stdout: '', 
        stderr: 'Error: Invalid codec' 
      });

      await expect(stitchAudioSegments('test_id', mockSegments))
        .rejects
        .toThrow();
    });

    test('cleans up temp files after success', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      expect(fs.unlink).toHaveBeenCalled();
      const unlinkCall = fs.unlink.mock.calls.find((call: any[]) =>
        call[0].includes('concat_list.txt')
      );
      expect(unlinkCall).toBeDefined();
    });

    test('handles cleanup errors gracefully', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockRejectedValue(new Error('Cleanup failed'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      await stitchAudioSegments('test_id', mockSegments);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clean up temp files:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('uses correct output path format', async () => {
      const fs = require('fs/promises');
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.stat = jest.fn().mockResolvedValue({ size: 2000000 });
      fs.unlink = jest.fn().mockResolvedValue(undefined);

      mockExec.mockResolvedValueOnce({ stdout: 'ffmpeg version', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '150', stderr: '' });
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await stitchAudioSegments('my_test_article', mockSegments);

      expect(result.filePath).toContain('my_test_article.mp3');
      expect(result.filePath).toContain('audio');
    });
  });
});

