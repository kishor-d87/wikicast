/**
 * Mock configuration for tests
 */

export const mockConfig = {
  xaiApiKey: 'test-xai-key',
  elevenLabsApiKey: 'test-elevenlabs-key',
  port: 3000,
  outputDir: '/tmp/test-output',
  nodeEnv: 'test',
};

export const getConfig = jest.fn(() => mockConfig);

