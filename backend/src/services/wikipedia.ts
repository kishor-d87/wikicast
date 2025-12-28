import { Article } from '../types/index.js';
import https from 'https';
import fetch from 'node-fetch';

/**
 * Wikipedia Service
 * 
 * Fetches and processes Wikipedia articles using the Wikimedia REST API.
 * Handles both URL-based and title-based fetching.
 */

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const MIN_CONTENT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 50000;

// Create an HTTPS agent that handles SSL certificates properly
// In development, we can be more lenient with certificate validation
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

interface WikipediaPageSummary {
  title: string;
  extract: string;
  extract_html: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
}

/**
 * Extracts article title from Wikipedia URL
 */
function extractTitleFromUrl(url: string): string {
  const urlPattern = /https?:\/\/en\.wikipedia\.org\/wiki\/([^#?]+)/;
  const match = url.match(urlPattern);
  
  if (!match) {
    throw new Error('Invalid Wikipedia URL format');
  }
  
  return decodeURIComponent(match[1].replace(/_/g, ' '));
}

/**
 * Cleans HTML content to plain text
 * Removes HTML tags, citations, and unnecessary whitespace
 */
function cleanHtmlToText(html: string): string {
  let text = html;
  
  // Remove citation/reference markers like [1], [2], etc.
  text = text.replace(/\[\d+\]/g, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Remove multiple spaces and normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Fetches article by Wikipedia URL
 */
export async function fetchArticleByUrl(url: string): Promise<Article> {
  const title = extractTitleFromUrl(url);
  return fetchArticleByTitle(title, url);
}

/**
 * Fetches article by title
 */
export async function fetchArticleByTitle(title: string, url?: string): Promise<Article> {
  // URL encode the title for the API call
  const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
  const apiUrl = `${WIKIPEDIA_API_BASE}/page/summary/${encodedTitle}`;
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'WikipediaPodcastGenerator/1.0',
      },
      agent: httpsAgent,
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Article not found: "${title}"`);
      }
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as WikipediaPageSummary;
    
    // Get the full content by fetching the HTML version
    const htmlUrl = `${WIKIPEDIA_API_BASE}/page/html/${encodedTitle}`;
    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'WikipediaPodcastGenerator/1.0',
      },
      agent: httpsAgent,
    });
    
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch article content: ${htmlResponse.status}`);
    }
    
    const rawContent = await htmlResponse.text();
    const cleanedText = cleanHtmlToText(rawContent);
    
    // Validate content length
    if (cleanedText.length < MIN_CONTENT_LENGTH) {
      throw new Error(
        `Article too short: ${cleanedText.length} characters (minimum: ${MIN_CONTENT_LENGTH})`
      );
    }
    
    // Truncate if too long
    const finalText = cleanedText.length > MAX_CONTENT_LENGTH
      ? cleanedText.substring(0, MAX_CONTENT_LENGTH) + '...'
      : cleanedText;
    
    // Count words
    const wordCount = finalText.split(/\s+/).length;
    
    const articleUrl = url || data.content_urls.desktop.page;
    
    const article: Article = {
      title: data.title,
      url: articleUrl,
      rawContent,
      cleanedText: finalText,
      summary: data.extract,
      wordCount,
      fetchedAt: new Date().toISOString(),
      language: 'en',
    };
    
    return article;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error fetching Wikipedia article');
  }
}

/**
 * Auto-detects input type and fetches article accordingly
 */
export async function fetchArticle(input: string, type?: 'url' | 'title'): Promise<Article> {
  // Auto-detect type if not specified
  const inputType = type || (input.startsWith('http') ? 'url' : 'title');
  
  if (inputType === 'url') {
    return fetchArticleByUrl(input);
  } else {
    return fetchArticleByTitle(input);
  }
}

