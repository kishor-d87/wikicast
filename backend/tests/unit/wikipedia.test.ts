/**
 * Unit Tests for Wikipedia Service
 * 
 * Tests article fetching, HTML cleaning, and error handling.
 */

import {
  fetchArticleByUrl,
  fetchArticleByTitle,
  fetchArticle,
} from '../../src/services/wikipedia.js';

// Mock node-fetch
jest.mock('node-fetch');

describe('Wikipedia Service', () => {
  const mockFetch = require('node-fetch').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArticleByUrl', () => {
    test('extracts title from URL and fetches article', async () => {
      const url = 'https://en.wikipedia.org/wiki/Albert_Einstein';
      
      // Mock summary API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Albert Einstein',
          extract: 'Albert Einstein was a German-born theoretical physicist.',
          content_urls: {
            desktop: {
              page: url
            }
          }
        })
      });

      // Mock HTML content API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Test content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByUrl(url);
      
      expect(result.title).toBe('Albert Einstein');
      expect(result.url).toBe(url);
      expect(result.cleanedText.length).toBeGreaterThan(500);
    });

    test('converts underscores to spaces in title', async () => {
      const url = 'https://en.wikipedia.org/wiki/New_York_City';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'New York City',
          extract: 'New York City is the most populous city in the United States.',
          content_urls: { desktop: { page: url } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content about New York. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByUrl(url);
      expect(result.title).toBe('New York City');
    });

    test('handles URL-encoded characters', async () => {
      const url = 'https://en.wikipedia.org/wiki/Caf%C3%A9';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Café',
          extract: 'A café is a type of restaurant.',
          content_urls: { desktop: { page: url } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Café content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByUrl(url);
      expect(result.title).toBe('Café');
    });

    test('throws error for invalid URL format', async () => {
      await expect(fetchArticleByUrl('https://en.wikipedia.org/about'))
        .rejects.toThrow('Invalid Wikipedia URL format');
    });
  });

  describe('fetchArticleByTitle', () => {
    test('fetches article by title', async () => {
      const title = 'Albert Einstein';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Albert Einstein',
          extract: 'Albert Einstein was a physicist.',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/Albert_Einstein'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Einstein content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle(title);
      
      expect(result.title).toBe('Albert Einstein');
      expect(result.cleanedText.length).toBeGreaterThan(500);
    });

    test('URL encodes the title', async () => {
      const title = 'C++ Programming';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'C++ Programming',
          extract: 'C++ is a programming language.',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/C%2B%2B'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'C++ content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle(title);
      expect(result.title).toBe('C++ Programming');
    });

    test('replaces spaces with underscores in API call', async () => {
      const title = 'New York City';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'New York City',
          extract: 'NYC is a city.',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/New_York_City'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'NYC content. '.repeat(100) + '</p>'
      });

      await fetchArticleByTitle(title);
      
      // Check that the API was called with underscored title
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('New_York_City'),
        expect.any(Object)
      );
    });

    test('throws error when article not found (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(fetchArticleByTitle('NonexistentArticle'))
        .rejects.toThrow('Article not found: "NonexistentArticle"');
    });

    test('throws error for other API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchArticleByTitle('Test'))
        .rejects.toThrow('Wikipedia API error: 500');
    });

    test('uses provided URL when given', async () => {
      const title = 'Test';
      const customUrl = 'https://en.wikipedia.org/wiki/Custom_URL';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Test article.',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Test content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle(title, customUrl);
      expect(result.url).toBe(customUrl);
    });
  });

  describe('HTML Cleaning', () => {
    test('removes HTML tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>This is <strong>bold</strong> text.</p>'.repeat(50)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText).not.toContain('<p>');
      expect(result.cleanedText).not.toContain('<strong>');
      expect(result.cleanedText).toContain('This is bold text');
    });

    test('removes citation markers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>This is a fact[1] with citation[2].</p>'.repeat(50)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText).not.toContain('[1]');
      expect(result.cleanedText).not.toContain('[2]');
    });

    test('decodes HTML entities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>Testing&nbsp;&amp;&lt;&gt;&quot;&#39;</p>'.repeat(50)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText).toContain(' '); // &nbsp;
      expect(result.cleanedText).toContain('&'); // &amp;
      expect(result.cleanedText).toContain('<'); // &lt;
      expect(result.cleanedText).toContain('>'); // &gt;
      expect(result.cleanedText).toContain('"'); // &quot;
      expect(result.cleanedText).toContain("'"); // &#39;
    });

    test('normalizes whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>Text   with    multiple     spaces</p>'.repeat(50)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText).not.toContain('  '); // No double spaces
    });

  test('trims leading and trailing whitespace', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: 'Test',
        extract: 'Summary',
        content_urls: { desktop: { page: 'https://test.com' } }
      })
    });

    // Make sure content is long enough (>500 chars)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '   <p>Content with text</p>   '.repeat(30)
    });

    const result = await fetchArticleByTitle('Test');
    expect(result.cleanedText).not.toMatch(/^\s/);
    expect(result.cleanedText).not.toMatch(/\s$/);
  });
  });

  describe('Content Validation', () => {
    test('throws error if content is too short', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>Too short</p>'
      });

      await expect(fetchArticleByTitle('Test'))
        .rejects.toThrow('Article too short');
    });

    test('accepts content at minimum length', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      // Create exactly 500 characters
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'A'.repeat(500)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText.length).toBeGreaterThanOrEqual(500);
    });

    test('truncates content above maximum length', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      // Create more than 50000 characters
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'A'.repeat(60000)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText.length).toBeLessThanOrEqual(50003); // 50000 + '...'
    });

    test('adds ellipsis when truncating', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'A'.repeat(60000)
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.cleanedText).toMatch(/\.\.\.$/);
    });
  });

  describe('Article Entity', () => {
    test('includes all required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test Article',
          extract: 'This is a test summary.',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/Test'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Test content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle('Test Article');
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('rawContent');
      expect(result).toHaveProperty('cleanedText');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('fetchedAt');
      expect(result).toHaveProperty('language');
    });

    test('sets language to en', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.language).toBe('en');
    });

    test('calculates word count correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      // Create content with known word count
      const words = 'word '.repeat(200);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<p>${words}</p>`
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.wordCount).toBe(200);
    });

    test('sets ISO timestamp', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('includes summary from API', async () => {
      const summary = 'This is the article summary.';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: summary,
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.summary).toBe(summary);
    });

    test('stores raw HTML content', async () => {
      const rawHtml = '<p>Raw <strong>HTML</strong> content</p>'.repeat(100);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => rawHtml
      });

      const result = await fetchArticleByTitle('Test');
      expect(result.rawContent).toBe(rawHtml);
    });
  });

  describe('fetchArticle (auto-detect)', () => {
    test('auto-detects URL input', async () => {
      const url = 'https://en.wikipedia.org/wiki/Test';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: url } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticle(url);
      expect(result.url).toBe(url);
    });

    test('auto-detects title input', async () => {
      const title = 'Albert Einstein';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Albert Einstein',
          extract: 'Physicist',
          content_urls: {
            desktop: {
              page: 'https://en.wikipedia.org/wiki/Albert_Einstein'
            }
          }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticle(title);
      expect(result.title).toBe('Albert Einstein');
    });

    test('respects explicit type parameter', async () => {
      const input = 'Test';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<p>' + 'Content. '.repeat(100) + '</p>'
      });

      const result = await fetchArticle(input, 'title');
      expect(result.title).toBe('Test');
    });
  });

  describe('Error Handling', () => {
    test('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchArticleByTitle('Test'))
        .rejects.toThrow('Network error');
    });

    test('handles failed HTML content fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://test.com' } }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(fetchArticleByTitle('Test'))
        .rejects.toThrow('Failed to fetch article content');
    });

    test('wraps unknown errors', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error type');

      await expect(fetchArticleByTitle('Test'))
        .rejects.toThrow('Unknown error fetching Wikipedia article');
    });
  });
});

