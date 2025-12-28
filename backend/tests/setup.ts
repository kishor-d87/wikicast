/**
 * Jest test setup
 * Runs before all tests
 */

// Mock the config module to avoid import.meta.url issues
jest.mock('../src/config/env.js', () => ({
  getConfig: jest.fn(() => ({
    xaiApiKey: 'test-xai-api-key',
    elevenLabsApiKey: 'test-elevenlabs-api-key',
    port: 3000,
    nodeEnv: 'test',
    outputDir: '/tmp/test-output',
    xaiApiUrl: 'https://api.x.ai/v1',
    elevenLabsApiUrl: 'https://api.elevenlabs.io/v1',
    wikipediaApiUrl: 'https://en.wikipedia.org/api/rest_v1',
  })),
  isProduction: jest.fn(() => false),
  isDevelopment: jest.fn(() => false),
  hasApiKeys: jest.fn(() => true),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.XAI_API_KEY = 'test-xai-key';
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';

