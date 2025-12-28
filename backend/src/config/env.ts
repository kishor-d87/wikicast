/**
 * Environment Configuration
 * 
 * Loads and validates environment variables.
 * All API keys must be provided via environment variables (FR-025).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file in development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment configuration interface
 */
export interface EnvConfig {
  // Required API keys
  xaiApiKey: string;
  elevenLabsApiKey: string;
  
  // Server configuration
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  
  // Output directory
  outputDir: string;
  
  // API endpoints
  xaiApiUrl: string;
  elevenLabsApiUrl: string;
  wikipediaApiUrl: string;
}

/**
 * Get optional environment variable with default
 */
function getOptional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Validate and load environment configuration
 */
function loadConfig(): EnvConfig {
  // In development, warn about missing keys instead of throwing
  const isDev = process.env.NODE_ENV !== 'production';
  
  let xaiApiKey = process.env.XAI_API_KEY || '';
  let elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
  
  if (!xaiApiKey && !isDev) {
    throw new Error('Missing required environment variable: XAI_API_KEY');
  }
  if (!elevenLabsApiKey && !isDev) {
    throw new Error('Missing required environment variable: ELEVENLABS_API_KEY');
  }
  
  // Warn in development
  if (isDev && !xaiApiKey) {
    console.warn('⚠️  Warning: XAI_API_KEY not set. Script generation will fail.');
  }
  if (isDev && !elevenLabsApiKey) {
    console.warn('⚠️  Warning: ELEVENLABS_API_KEY not set. TTS will fail.');
  }
  
  const port = parseInt(getOptional('PORT', '3000'), 10);
  const nodeEnv = getOptional('NODE_ENV', 'development') as EnvConfig['nodeEnv'];
  
  // Resolve output directory relative to project root
  const projectRoot = path.resolve(__dirname, '../../..');
  const outputDir = path.resolve(
    projectRoot,
    getOptional('OUTPUT_DIR', './output')
  );
  
  return {
    xaiApiKey,
    elevenLabsApiKey,
    port,
    nodeEnv,
    outputDir,
    xaiApiUrl: 'https://api.x.ai/v1',
    elevenLabsApiUrl: 'https://api.elevenlabs.io/v1',
    wikipediaApiUrl: 'https://en.wikipedia.org/api/rest_v1',
  };
}

/**
 * Singleton configuration instance
 */
let _config: EnvConfig | null = null;

/**
 * Get environment configuration
 * Loads and validates on first access
 */
export function getConfig(): EnvConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === 'development';
}

/**
 * Check if API keys are configured
 */
export function hasApiKeys(): boolean {
  const config = getConfig();
  return Boolean(config.xaiApiKey && config.elevenLabsApiKey);
}

