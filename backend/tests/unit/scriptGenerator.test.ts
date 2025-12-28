/**
 * Unit Tests for Script Generator Service
 * 
 * Tests script validation, duration calculation, and utility functions.
 * Note: callGrokAPI is tested via integration tests due to external API dependency.
 */

import { generateScript } from '../../src/services/scriptGenerator.js';
import type { Article, ScriptLine } from '../../src/types/index.js';

// Mock the Grok API calls
jest.mock('node-fetch');

describe('Script Generator Service', () => {
  // Helper to create a valid test article
  const createTestArticle = (): Article => ({
    title: 'Test Article',
    url: 'https://en.wikipedia.org/wiki/Test_Article',
    rawContent: '<html>Raw content</html>',
    cleanedText: 'This is test content. '.repeat(50),
    summary: 'Test summary',
    wordCount: 150,
    fetchedAt: '2024-01-01T00:00:00Z',
    language: 'en',
  });

  // Helper to create valid script lines
  const createValidScriptLines = (): ScriptLine[] => [
    { index: 1, speaker: 'Nishi', text: 'Hello and welcome!', section: 'greeting' },
    { index: 2, speaker: 'Shyam', text: 'Hi there! Today we discuss...', section: 'greeting' },
    { index: 3, speaker: 'Nishi', text: 'So tell me about this topic.', section: 'greeting' },
    { index: 4, speaker: 'Shyam', text: 'This is the main explanation.', section: 'explanation' },
    { index: 5, speaker: 'Nishi', text: 'That makes sense.', section: 'explanation' },
    { index: 6, speaker: 'Shyam', text: 'Let me elaborate further.', section: 'explanation' },
    { index: 7, speaker: 'Nishi', text: 'Can you clarify that?', section: 'clarification' },
    { index: 8, speaker: 'Shyam', text: 'Sure, here is more detail.', section: 'clarification' },
    { index: 9, speaker: 'Nishi', text: 'What about this aspect?', section: 'qna' },
    { index: 10, speaker: 'Shyam', text: 'Good question!', section: 'qna' },
    { index: 11, speaker: 'Nishi', text: 'Thanks for explaining.', section: 'signoff' },
    { index: 12, speaker: 'Shyam', text: 'See you next time!', section: 'signoff' },
  ];

  describe('Script Validation', () => {
    describe('minimum line requirement', () => {
      test('rejects scripts with fewer than 10 lines', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        // Mock Grok API to return too few lines
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  lines: [
                    { index: 1, speaker: 'Nishi', text: 'Hi', section: 'greeting' },
                    { index: 2, speaker: 'Shyam', text: 'Hello', section: 'greeting' },
                  ]
                })
              }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Script too short: must have at least 10 lines');
      });

      test('accepts scripts with exactly 10 lines', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        // Create exactly 10 lines with all 5 required sections
        const lines: ScriptLine[] = [
          { index: 1, speaker: 'Nishi', text: 'Hello', section: 'greeting' },
          { index: 2, speaker: 'Shyam', text: 'Hi', section: 'greeting' },
          { index: 3, speaker: 'Nishi', text: 'Tell me', section: 'explanation' },
          { index: 4, speaker: 'Shyam', text: 'Sure', section: 'explanation' },
          { index: 5, speaker: 'Nishi', text: 'What', section: 'clarification' },
          { index: 6, speaker: 'Shyam', text: 'Here', section: 'clarification' },
          { index: 7, speaker: 'Nishi', text: 'Why', section: 'qna' },
          { index: 8, speaker: 'Shyam', text: 'Because', section: 'qna' },
          { index: 9, speaker: 'Nishi', text: 'Thanks', section: 'signoff' },
          { index: 10, speaker: 'Shyam', text: 'Bye', section: 'signoff' },
        ];
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({ lines })
              }
            }]
          })
        });

        const result = await generateScript(article);
        expect(result.lines).toHaveLength(10);
      });

      test('accepts scripts with more than 10 lines', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({ lines })
              }
            }]
          })
        });

        const result = await generateScript(article);
        expect(result.lines.length).toBeGreaterThanOrEqual(10);
      });
    });

    describe('section validation', () => {
      test('rejects scripts missing greeting section', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines().map(line => 
          line.section === 'greeting' ? { ...line, section: 'explanation' as const } : line
        );
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Missing required section: greeting');
      });

      test('rejects scripts missing explanation section', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines().map(line => 
          line.section === 'explanation' ? { ...line, section: 'greeting' as const } : line
        );
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Missing required section: explanation');
      });

      test('rejects scripts missing clarification section', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines().filter(line => line.section !== 'clarification');
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Missing required section: clarification');
      });

      test('rejects scripts missing qna section', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines().filter(line => line.section !== 'qna');
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Missing required section: qna');
      });

      test('rejects scripts missing signoff section', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines().filter(line => line.section !== 'signoff');
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Missing required section: signoff');
      });

      test('accepts scripts with all 5 required sections', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        const result = await generateScript(article);
        expect(result.sections.greeting.length).toBeGreaterThan(0);
        expect(result.sections.explanation.length).toBeGreaterThan(0);
        expect(result.sections.clarification.length).toBeGreaterThan(0);
        expect(result.sections.qna.length).toBeGreaterThan(0);
        expect(result.sections.signoff.length).toBeGreaterThan(0);
      });
    });

    describe('speaker validation', () => {
      test('rejects scripts with invalid speaker names', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        lines[0] = { ...lines[0], speaker: 'InvalidSpeaker' as any };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Invalid speaker: InvalidSpeaker');
      });

      test('accepts scripts with only Nishi and Shyam', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        const result = await generateScript(article);
        const speakers = new Set(result.lines.map(l => l.speaker));
        expect(speakers.size).toBeLessThanOrEqual(2);
        expect(Array.from(speakers).every(s => s === 'Nishi' || s === 'Shyam')).toBe(true);
      });
    });

    describe('section order validation', () => {
      test('rejects scripts with sections out of order', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        // Swap some sections to break order
        lines[3] = { ...lines[3], section: 'signoff' as const };
        lines[11] = { ...lines[11], section: 'explanation' as const };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Sections out of order');
      });

      test('accepts scripts with correct section order', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines = createValidScriptLines();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        const result = await generateScript(article);
        expect(result).toBeDefined();
      });
    });

    describe('consecutive speaker validation', () => {
      test('rejects scripts with more than 5 consecutive lines by same speaker', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines: ScriptLine[] = [
          { index: 1, speaker: 'Nishi', text: 'Line 1', section: 'greeting' },
          { index: 2, speaker: 'Nishi', text: 'Line 2', section: 'greeting' },
          { index: 3, speaker: 'Nishi', text: 'Line 3', section: 'greeting' },
          { index: 4, speaker: 'Nishi', text: 'Line 4', section: 'explanation' },
          { index: 5, speaker: 'Nishi', text: 'Line 5', section: 'explanation' },
          { index: 6, speaker: 'Nishi', text: 'Line 6', section: 'explanation' },
          { index: 7, speaker: 'Shyam', text: 'Line 7', section: 'clarification' },
          { index: 8, speaker: 'Shyam', text: 'Line 8', section: 'clarification' },
          { index: 9, speaker: 'Nishi', text: 'Line 9', section: 'qna' },
          { index: 10, speaker: 'Shyam', text: 'Line 10', section: 'signoff' },
        ];
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        await expect(generateScript(article)).rejects.toThrow('Too many consecutive lines');
      });

      test('accepts scripts with up to 5 consecutive lines by same speaker', async () => {
        const article = createTestArticle();
        const mockFetch = require('node-fetch').default;
        
        const lines: ScriptLine[] = [
          { index: 1, speaker: 'Nishi', text: 'Line 1', section: 'greeting' },
          { index: 2, speaker: 'Nishi', text: 'Line 2', section: 'greeting' },
          { index: 3, speaker: 'Nishi', text: 'Line 3', section: 'greeting' },
          { index: 4, speaker: 'Nishi', text: 'Line 4', section: 'explanation' },
          { index: 5, speaker: 'Nishi', text: 'Line 5', section: 'explanation' },
          { index: 6, speaker: 'Shyam', text: 'Line 6', section: 'explanation' },
          { index: 7, speaker: 'Shyam', text: 'Line 7', section: 'clarification' },
          { index: 8, speaker: 'Shyam', text: 'Line 8', section: 'clarification' },
          { index: 9, speaker: 'Nishi', text: 'Line 9', section: 'qna' },
          { index: 10, speaker: 'Shyam', text: 'Line 10', section: 'signoff' },
        ];
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: JSON.stringify({ lines }) }
            }]
          })
        });

        const result = await generateScript(article);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Duration Calculation', () => {
    test('calculates duration based on 150 WPM', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      // Create lines with exactly 300 words (should be 120 seconds)
      const lines = createValidScriptLines().map((line) => ({
        ...line,
        text: 'word '.repeat(25), // 25 words per line
      }));
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      // 12 lines * 25 words = 300 words
      // 300 words / 150 WPM = 2 minutes = 120 seconds
      expect(result.estimatedDuration).toBe(120);
    });

    test('counts words correctly', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.totalWords).toBeGreaterThan(0);
    });

    test('warns if duration is outside target range', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create very short script (< 120 seconds)
      const lines = createValidScriptLines().map(line => ({
        ...line,
        text: 'short',
      }));
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      await generateScript(article);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('outside target range')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Script ID Generation', () => {
    test('generates ID with sanitized title', async () => {
      const article = createTestArticle();
      article.title = 'Test Article!@#$%';
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.id).toMatch(/^test_article_\d{8}_\d{6}$/);
    });

    test('generates ID with timestamp', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.id).toMatch(/_\d{8}_\d{6}$/);
    });

    test('converts spaces to underscores', async () => {
      const article = createTestArticle();
      article.title = 'Multi Word Title';
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.id).toContain('multi_word_title');
    });

    test('truncates long titles to 50 characters', async () => {
      const article = createTestArticle();
      article.title = 'A'.repeat(100);
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      const titlePart = result.id.split('_').slice(0, -2).join('_');
      expect(titlePart.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Script Entity', () => {
    test('includes all required fields', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('articleTitle');
      expect(result).toHaveProperty('articleUrl');
      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('totalWords');
      expect(result).toHaveProperty('estimatedDuration');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('generationParams');
    });

    test('sets correct article reference', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.articleTitle).toBe(article.title);
      expect(result.articleUrl).toBe(article.url);
    });

    test('organizes sections correctly', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.sections).toHaveProperty('greeting');
      expect(result.sections).toHaveProperty('explanation');
      expect(result.sections).toHaveProperty('clarification');
      expect(result.sections).toHaveProperty('qna');
      expect(result.sections).toHaveProperty('signoff');
      
      // Check that sections contain line indices
      expect(Array.isArray(result.sections.greeting)).toBe(true);
      expect(result.sections.greeting.length).toBeGreaterThan(0);
    });

    test('includes generation parameters', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.generationParams).toHaveProperty('temperature');
      expect(result.generationParams).toHaveProperty('maxTokens');
      expect(result.generationParams).toHaveProperty('promptVersion');
      expect(result.generationParams.temperature).toBe(0);
    });

    test('sets ISO timestamp', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      const lines = createValidScriptLines();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: JSON.stringify({ lines }) }
          }]
        })
      });

      const result = await generateScript(article);
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Error Handling', () => {
    test('handles Grok API errors', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error details'
      });

      await expect(generateScript(article)).rejects.toThrow('Grok API error');
    });

    test('handles invalid JSON responses', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Not valid JSON'
            }
          }]
        })
      });

      await expect(generateScript(article)).rejects.toThrow('Failed to parse Grok response');
    });

    test('handles missing choices in response', async () => {
      const article = createTestArticle();
      const mockFetch = require('node-fetch').default;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      });

      await expect(generateScript(article)).rejects.toThrow('No response from Grok API');
    });
  });
});

