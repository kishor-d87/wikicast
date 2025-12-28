/**
 * Input Validation Utility
 * 
 * Validates user input for podcast generation.
 * Handles URL validation, title sanitization, and content validation.
 */

import type { PodcastInputType } from '../types/index.js';
import { MIN_ARTICLE_LENGTH, MAX_ARTICLE_LENGTH } from '../types/index.js';

/**
 * Extended Wikipedia URL pattern (includes mobile and other subdomains)
 * Matches: https://en.wikipedia.org/wiki/Article_Name
 * Also handles: https://m.wikipedia.org/wiki/Article_Name
 */
const WIKIPEDIA_URL_EXTENDED = /^https?:\/\/([a-z]{2}\.)?(?:m\.)?wikipedia\.org\/wiki\/[^/]+$/i;

/**
 * Check if a string is a valid Wikipedia URL
 */
export function isWikipediaUrl(input: string): boolean {
  return WIKIPEDIA_URL_EXTENDED.test(input.trim());
}

/**
 * Check if a string looks like a URL
 */
export function isUrl(input: string): boolean {
  return input.trim().toLowerCase().startsWith('http');
}

/**
 * Detect input type (URL or title)
 */
export function detectInputType(input: string): PodcastInputType {
  return isUrl(input) ? 'url' : 'title';
}

/**
 * Validate Wikipedia URL
 * Returns error message if invalid, null if valid
 */
export function validateWikipediaUrl(url: string): string | null {
  const trimmed = url.trim();
  
  if (!trimmed) {
    return 'URL cannot be empty';
  }
  
  if (!isUrl(trimmed)) {
    return 'Input does not appear to be a URL';
  }
  
  if (!isWikipediaUrl(trimmed)) {
    return 'URL must be a valid Wikipedia article URL (e.g., https://en.wikipedia.org/wiki/Article_Name)';
  }
  
  // Check for English Wikipedia specifically for MVP
  if (!trimmed.match(/^https?:\/\/(en\.)?(m\.)?wikipedia\.org/i)) {
    return 'Only English Wikipedia articles are supported';
  }
  
  return null;
}

/**
 * Extract article title from Wikipedia URL
 */
export function extractTitleFromUrl(url: string): string {
  const match = url.match(/\/wiki\/([^/?#]+)/);
  if (!match) {
    throw new Error('Could not extract article title from URL');
  }
  // Decode URL-encoded characters
  return decodeURIComponent(match[1].replace(/_/g, ' '));
}

/**
 * Validate article title
 * Returns error message if invalid, null if valid
 */
export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  
  if (!trimmed) {
    return 'Article title cannot be empty';
  }
  
  if (trimmed.length > 256) {
    return 'Article title is too long (max 256 characters)';
  }
  
  // Check for obviously invalid titles
  if (/^[0-9]+$/.test(trimmed)) {
    return 'Article title cannot be just numbers';
  }
  
  return null;
}

/**
 * Sanitize article title for search
 */
export function sanitizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename chars
}

/**
 * Validate article content length
 */
export function validateContentLength(content: string): {
  valid: boolean;
  error?: string;
  wordCount: number;
} {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = content.length;
  
  if (charCount < MIN_ARTICLE_LENGTH) {
    return {
      valid: false,
      error: `Article is too short (${charCount} characters, minimum ${MIN_ARTICLE_LENGTH})`,
      wordCount
    };
  }
  
  return {
    valid: true,
    wordCount
  };
}

/**
 * Truncate content if too long
 */
export function truncateContent(content: string): string {
  if (content.length <= MAX_ARTICLE_LENGTH) {
    return content;
  }
  
  // Find a good break point (end of sentence) near the max
  const truncated = content.slice(0, MAX_ARTICLE_LENGTH);
  const lastPeriod = truncated.lastIndexOf('.');
  
  if (lastPeriod > MAX_ARTICLE_LENGTH * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }
  
  return truncated + '...';
}

/**
 * Validate podcast request input
 */
export function validatePodcastInput(
  input: string,
  type?: PodcastInputType
): { valid: boolean; error?: string; type: PodcastInputType } {
  const trimmedInput = input?.trim();
  
  if (!trimmedInput) {
    return {
      valid: false,
      error: 'Input is required',
      type: type || 'url'
    };
  }
  
  // Auto-detect type if not specified
  const detectedType = type || detectInputType(trimmedInput);
  
  if (detectedType === 'url') {
    const urlError = validateWikipediaUrl(trimmedInput);
    if (urlError) {
      return { valid: false, error: urlError, type: detectedType };
    }
  } else {
    const titleError = validateTitle(trimmedInput);
    if (titleError) {
      return { valid: false, error: titleError, type: detectedType };
    }
  }
  
  return { valid: true, type: detectedType };
}

/**
 * Alias for validatePodcastInput for backwards compatibility
 */
export const validateInput = validatePodcastInput;

/**
 * Check if content is in English
 * Simple heuristic based on common English words
 */
export function isLikelyEnglish(text: string): boolean {
  const englishWords = ['the', 'is', 'was', 'are', 'and', 'of', 'to', 'in', 'a', 'for'];
  const words = text.toLowerCase().split(/\s+/).slice(0, 100);
  const matchCount = words.filter(w => englishWords.includes(w)).length;
  return matchCount >= 5;
}

/**
 * Normalize Wikipedia URL to canonical form
 */
export function normalizeWikipediaUrl(url: string): string {
  // Remove mobile prefix, normalize to en.wikipedia.org
  return url
    .replace(/\/\/m\.wikipedia/, '//en.wikipedia')
    .replace(/\/\/([a-z]{2})\.m\.wikipedia/, '//en.wikipedia')
    .replace(/\/\/wikipedia\.org/, '//en.wikipedia.org');
}

