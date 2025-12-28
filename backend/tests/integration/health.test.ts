/**
 * Integration Tests for Health Check Endpoint
 * 
 * Tests GET /api/health endpoint functionality
 */

import request from 'supertest';
import express, { Express } from 'express';
import healthRouter from '../../src/routes/health.js';

describe('GET /api/health', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use('/api/health', healthRouter);
  });

  test('returns health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('checks');
  });

  test('includes ffmpeg check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.checks).toHaveProperty('ffmpeg');
    expect(['ok', 'error']).toContain(response.body.checks.ffmpeg);
  });

  test('includes output directory check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.checks).toHaveProperty('outputDir');
    expect(['ok', 'error']).toContain(response.body.checks.outputDir);
  });

  test('returns 200 when healthy', async () => {
    const response = await request(app).get('/api/health');

    if (response.body.status === 'healthy') {
      expect(response.status).toBe(200);
    }
  });

  test('returns 503 when unhealthy', async () => {
    const response = await request(app).get('/api/health');

    if (response.body.status === 'unhealthy') {
      expect(response.status).toBe(503);
    }
  });

  test('uptime increases over time', async () => {
    const response1 = await request(app).get('/api/health');
    const uptime1 = response1.body.uptime;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    const response2 = await request(app).get('/api/health');
    const uptime2 = response2.body.uptime;

    expect(uptime2).toBeGreaterThanOrEqual(uptime1);
  });

  test('version matches expected format', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('uptime is a non-negative number', async () => {
    const response = await request(app).get('/api/health');

    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  test('status is either healthy or unhealthy', async () => {
    const response = await request(app).get('/api/health');

    expect(['healthy', 'unhealthy']).toContain(response.body.status);
  });

  test('all checks are present', async () => {
    const response = await request(app).get('/api/health');

    expect(Object.keys(response.body.checks)).toEqual(
      expect.arrayContaining(['ffmpeg', 'outputDir'])
    );
  });
});

