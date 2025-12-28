/**
 * Unit Tests for File Manager Utility
 * 
 * Tests file operations, path generation, and JSON handling
 */

import {
  sanitizeFilename,
  generateId,
  getTimestampFromId,
  ensureOutputDirs,
  getScriptPath,
  getAudioPath,
  getSegmentsDir,
  getSegmentPath,
  getMetadataPath,
  saveJson,
  loadJson,
  fileExists,
  getFileSize,
  saveScript,
  loadScript,
  saveMetadata,
  loadMetadata,
  saveBinary,
  createSegmentsDir,
  cleanupSegments,
  listPodcasts,
  checkOutputDir,
} from '../../src/utils/fileManager.js';
import type { Script, GenerationMetadata } from '../../src/types/index.js';

describe('File Manager Utility', () => {
  const fs = require('fs/promises');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeFilename', () => {
    test('converts to lowercase', () => {
      expect(sanitizeFilename('Hello World')).toBe('hello_world');
    });

    test('replaces spaces with underscores', () => {
      expect(sanitizeFilename('my test file')).toBe('my_test_file');
    });

    test('removes special characters', () => {
      expect(sanitizeFilename('test@#$%^&*()file')).toBe('testfile');
    });

    test('preserves hyphens', () => {
      expect(sanitizeFilename('my-test-file')).toBe('my-test-file');
    });

    test('preserves underscores', () => {
      expect(sanitizeFilename('my_test_file')).toBe('my_test_file');
    });

    test('truncates to 50 characters', () => {
      const longString = 'a'.repeat(100);
      expect(sanitizeFilename(longString)).toHaveLength(50);
    });

    test('handles empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    test('handles mixed case and special chars', () => {
      expect(sanitizeFilename('Article: The Best!')).toBe('article_the_best');
    });
  });

  describe('generateId', () => {
    test('generates ID with sanitized title and timestamp', () => {
      const date = new Date('2025-01-01T12:30:45.123Z');
      const id = generateId('Test Article', date);
      
      expect(id).toMatch(/^test_article_\d{8}_\d{6}$/);
      expect(id).toContain('20250101');
      expect(id).toContain('123045');
    });

    test('uses current time if no timestamp provided', () => {
      const id = generateId('Test');
      expect(id).toMatch(/^test_\d{8}_\d{6}$/);
    });

    test('handles long titles', () => {
      const longTitle = 'A'.repeat(100);
      const id = generateId(longTitle);
      const titlePart = id.split('_').slice(0, -2).join('_');
      expect(titlePart.length).toBeLessThanOrEqual(50);
    });

    test('handles special characters in title', () => {
      const id = generateId('Test@#$%Article!');
      expect(id).toContain('testarticle');
    });
  });

  describe('getTimestampFromId', () => {
    test('extracts timestamp from ID', () => {
      const id = 'test_article_20250101_123045';
      const timestamp = getTimestampFromId(id);
      expect(timestamp).toBe('20250101_123045');
    });

    test('handles complex IDs with multiple underscores', () => {
      const id = 'my_complex_article_title_20250101_123045';
      const timestamp = getTimestampFromId(id);
      expect(timestamp).toBe('20250101_123045');
    });

    test('returns empty string for invalid ID', () => {
      expect(getTimestampFromId('invalid')).toBe('');
      expect(getTimestampFromId('')).toBe('');
    });
  });

  describe('ensureOutputDirs', () => {
    test('creates all required directories', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      await ensureOutputDirs();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
      
      // Should create base dir + subdirs
      expect(fs.mkdir.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    test('creates scripts directory', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      await ensureOutputDirs();

      const scriptsCall = fs.mkdir.mock.calls.find((call: any[]) =>
        call[0].includes('scripts')
      );
      expect(scriptsCall).toBeDefined();
    });

    test('creates audio directory', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      await ensureOutputDirs();

      const audioCall = fs.mkdir.mock.calls.find((call: any[]) =>
        call[0].includes('audio')
      );
      expect(audioCall).toBeDefined();
    });

    test('creates metadata directory', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      await ensureOutputDirs();

      const metadataCall = fs.mkdir.mock.calls.find((call: any[]) =>
        call[0].includes('metadata')
      );
      expect(metadataCall).toBeDefined();
    });
  });

  describe('Path getters', () => {
    test('getScriptPath returns correct path', () => {
      const path = getScriptPath('test_id');
      expect(path).toContain('scripts');
      expect(path).toContain('test_id.json');
    });

    test('getAudioPath returns correct path', () => {
      const path = getAudioPath('test_id');
      expect(path).toContain('audio');
      expect(path).toContain('test_id.mp3');
    });

    test('getSegmentsDir returns correct path', () => {
      const path = getSegmentsDir('test_id');
      expect(path).toContain('segments');
      expect(path).toContain('test_id');
    });

    test('getSegmentPath returns correct path with zero-padding', () => {
      expect(getSegmentPath('test_id', 1)).toContain('001.mp3');
      expect(getSegmentPath('test_id', 10)).toContain('010.mp3');
      expect(getSegmentPath('test_id', 100)).toContain('100.mp3');
    });

    test('getMetadataPath returns correct path', () => {
      const path = getMetadataPath('test_id');
      expect(path).toContain('metadata');
      expect(path).toContain('test_id.json');
    });
  });

  describe('saveJson', () => {
    test('saves JSON with proper formatting', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const data = { test: 'value', number: 42 };
      await saveJson('/tmp/test.json', data);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/test.json',
        expect.stringContaining('"test": "value"'),
        'utf-8'
      );
    });

    test('creates directory if not exists', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      await saveJson('/tmp/subdir/test.json', { test: 'value' });

      expect(fs.mkdir).toHaveBeenCalledWith(
        '/tmp/subdir',
        { recursive: true }
      );
    });

    test('handles complex objects', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const data = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
      };

      await saveJson('/tmp/test.json', data);

      expect(fs.writeFile).toHaveBeenCalled();
      const writtenData = fs.writeFile.mock.calls[0][1];
      const parsed = JSON.parse(writtenData);
      expect(parsed).toEqual(data);
    });
  });

  describe('loadJson', () => {
    test('loads and parses JSON', async () => {
      const data = { test: 'value', number: 42 };
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(data));

      const result = await loadJson('/tmp/test.json');

      expect(result).toEqual(data);
      expect(fs.readFile).toHaveBeenCalledWith('/tmp/test.json', 'utf-8');
    });

    test('handles arrays', async () => {
      const data = [1, 2, 3, 4, 5];
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(data));

      const result = await loadJson<number[]>('/tmp/test.json');

      expect(result).toEqual(data);
    });

    test('throws error on invalid JSON', async () => {
      fs.readFile = jest.fn().mockResolvedValue('invalid json{]');

      await expect(loadJson('/tmp/test.json')).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    test('returns true when file exists', async () => {
      fs.access = jest.fn().mockResolvedValue(undefined);

      const exists = await fileExists('/tmp/test.json');

      expect(exists).toBe(true);
    });

    test('returns false when file does not exist', async () => {
      fs.access = jest.fn().mockRejectedValue(new Error('ENOENT'));

      const exists = await fileExists('/tmp/nonexistent.json');

      expect(exists).toBe(false);
    });
  });

  describe('getFileSize', () => {
    test('returns file size in bytes', async () => {
      fs.stat = jest.fn().mockResolvedValue({ size: 1024 });

      const size = await getFileSize('/tmp/test.mp3');

      expect(size).toBe(1024);
    });

    test('handles large files', async () => {
      fs.stat = jest.fn().mockResolvedValue({ size: 10000000 });

      const size = await getFileSize('/tmp/large.mp3');

      expect(size).toBe(10000000);
    });
  });

  describe('saveScript', () => {
    const mockScript: Script = {
      id: 'test_script_123',
      articleTitle: 'Test',
      articleUrl: 'https://test.com',
      lines: [],
      sections: { greeting: [], explanation: [], clarification: [], qna: [], signoff: [] },
      totalWords: 100,
      estimatedDuration: 120,
      generatedAt: '2025-01-01T00:00:00Z',
      model: 'grok-3',
      generationParams: { temperature: 0, maxTokens: 4096, promptVersion: '1.0.0' },
    };

    test('saves script to correct path', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const path = await saveScript(mockScript);

      expect(path).toContain('scripts');
      expect(path).toContain('test_script_123.json');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    test('returns file path', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const path = await saveScript(mockScript);

      expect(path).toBeTruthy();
      expect(path).toMatch(/\.json$/);
    });
  });

  describe('loadScript', () => {
    test('loads script from file', async () => {
      const mockScript = { id: 'test', articleTitle: 'Test' };
      fs.access = jest.fn().mockResolvedValue(undefined);
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockScript));

      const script = await loadScript('test');

      expect(script).toEqual(mockScript);
    });

    test('returns null when file does not exist', async () => {
      fs.access = jest.fn().mockRejectedValue(new Error('ENOENT'));

      const script = await loadScript('nonexistent');

      expect(script).toBeNull();
    });
  });

  describe('saveMetadata and loadMetadata', () => {
    const mockMetadata: GenerationMetadata = {
      id: 'test_id',
      source: { title: 'Test', url: 'https://test.com', fetchedAt: '2025-01-01T00:00:00Z' },
      script: { id: 'test', generatedAt: '2025-01-01T00:00:00Z', model: 'grok-3', promptVersion: '1.0.0', temperature: 0 },
      audio: { id: 'test', createdAt: '2025-01-01T00:00:00Z', durationSeconds: 120, voiceMapping: {} },
      pipeline: { version: '1.0.0', startedAt: '2025-01-01T00:00:00Z', completedAt: '2025-01-01T00:00:00Z', stages: [] },
      artifacts: { scriptPath: '/scripts/test.json', audioPath: '/audio/test.mp3', metadataPath: '/metadata/test.json' },
    };

    test('saves and loads metadata', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);
      fs.access = jest.fn().mockResolvedValue(undefined);
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockMetadata));

      await saveMetadata(mockMetadata);
      const loaded = await loadMetadata('test_id');

      expect(loaded).toEqual(mockMetadata);
    });

    test('returns null when metadata not found', async () => {
      fs.access = jest.fn().mockRejectedValue(new Error('ENOENT'));

      const metadata = await loadMetadata('nonexistent');

      expect(metadata).toBeNull();
    });
  });

  describe('saveBinary', () => {
    test('saves binary data to file', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const buffer = Buffer.from([1, 2, 3, 4, 5]);
      await saveBinary('/tmp/test.mp3', buffer);

      expect(fs.writeFile).toHaveBeenCalledWith('/tmp/test.mp3', buffer);
    });

    test('creates directory structure', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      await saveBinary('/tmp/deep/path/test.mp3', Buffer.from([]));

      expect(fs.mkdir).toHaveBeenCalledWith(
        '/tmp/deep/path',
        { recursive: true }
      );
    });
  });

  describe('createSegmentsDir', () => {
    test('creates segments directory', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      const dir = await createSegmentsDir('test_id');

      expect(dir).toContain('segments');
      expect(dir).toContain('test_id');
      expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
    });
  });

  describe('cleanupSegments', () => {
    test('removes segments directory', async () => {
      fs.rm = jest.fn().mockResolvedValue(undefined);

      await cleanupSegments('test_id');

      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('segments/test_id'),
        { recursive: true, force: true }
      );
    });

    test('ignores errors during cleanup', async () => {
      fs.rm = jest.fn().mockRejectedValue(new Error('ENOENT'));

      await expect(cleanupSegments('test_id')).resolves.not.toThrow();
    });
  });

  describe('listPodcasts', () => {
    test('returns list of podcast IDs', async () => {
      fs.readdir = jest.fn().mockResolvedValue([
        'podcast1.mp3',
        'podcast2.mp3',
        'other_file.txt',
        'podcast3.mp3',
      ]);

      const podcasts = await listPodcasts();

      expect(podcasts).toEqual(['podcast1', 'podcast2', 'podcast3']);
    });

    test('returns empty array when directory does not exist', async () => {
      fs.readdir = jest.fn().mockRejectedValue(new Error('ENOENT'));

      const podcasts = await listPodcasts();

      expect(podcasts).toEqual([]);
    });

    test('filters out non-mp3 files', async () => {
      fs.readdir = jest.fn().mockResolvedValue([
        'test.mp3',
        'test.json',
        'test.txt',
      ]);

      const podcasts = await listPodcasts();

      expect(podcasts).toEqual(['test']);
    });
  });

  describe('checkOutputDir', () => {
    test('returns true when directory is accessible', async () => {
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      const result = await checkOutputDir();

      expect(result).toBe(true);
    });

    test('returns false on error', async () => {
      fs.mkdir = jest.fn().mockRejectedValue(new Error('Permission denied'));

      const result = await checkOutputDir();

      expect(result).toBe(false);
    });
  });
});

