/**
 * Health Check Endpoint
 * 
 * GET /api/health - Returns service health status
 * Per api.yaml specification
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { HealthResponse } from '../types/index.js';
import { PIPELINE_VERSION } from '../types/index.js';
import { checkOutputDir } from '../utils/fileManager.js';

const execAsync = promisify(exec);
const router = Router();

// Track server start time
const serverStartTime = Date.now();

/**
 * Check if FFmpeg is available
 */
async function checkFfmpeg(): Promise<'ok' | 'error'> {
  try {
    await execAsync('ffmpeg -version');
    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * GET /api/health
 * 
 * Returns service health status including:
 * - Overall status (healthy/unhealthy)
 * - Server uptime
 * - Dependency checks (FFmpeg, output directory)
 */
router.get('/', async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  
  // Run health checks
  const [ffmpegStatus, outputDirStatus] = await Promise.all([
    checkFfmpeg(),
    checkOutputDir().then(ok => ok ? 'ok' : 'error') as Promise<'ok' | 'error'>
  ]);
  
  // Determine overall health
  const isHealthy = ffmpegStatus === 'ok' && outputDirStatus === 'ok';
  
  const response: HealthResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: PIPELINE_VERSION,
    uptime: uptimeSeconds,
    checks: {
      ffmpeg: ffmpegStatus,
      outputDir: outputDirStatus
    }
  };
  
  // Return appropriate status code
  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(response);
});

export default router;

