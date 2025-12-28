/**
 * Wikipedia Podcast Generator - Backend Entry Point
 * 
 * Express server handling podcast generation API.
 * Serves frontend static files in production.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig, isDevelopment } from './config/env.js';
import { errorHandler } from './utils/errors.js';
import { ensureOutputDirs } from './utils/fileManager.js';
import healthRouter from './routes/health.js';
import podcastRouter from './routes/podcast.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 */
function createApp(): express.Application {
  const app = express();
  
  // ==========================================================================
  // Middleware
  // ==========================================================================
  
  // Parse JSON bodies
  app.use(express.json());
  
  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));
  
  // CORS configuration
  app.use(cors({
    origin: isDevelopment() 
      ? ['http://localhost:5173', 'http://localhost:3000']
      : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
  // Request logging in development
  if (isDevelopment()) {
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }
  
  // ==========================================================================
  // API Routes
  // ==========================================================================
  
  // Health check
  app.use('/api/health', healthRouter);
  
  // Podcast routes
  app.use('/api/podcast', podcastRouter);
  
  // ==========================================================================
  // Static Files (Production)
  // ==========================================================================
  
  // Serve frontend static files in production
  if (!isDevelopment()) {
    const publicPath = path.join(__dirname, '../public');
    app.use(express.static(publicPath));
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
      } else {
        res.sendFile(path.join(publicPath, 'index.html'));
      }
    });
  }
  
  // ==========================================================================
  // Error Handling
  // ==========================================================================
  
  // 404 handler for API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist',
    });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  const config = getConfig();
  
  console.log('🎙️  Wikipedia Podcast Generator');
  console.log('================================');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Output directory: ${config.outputDir}`);
  
  // Ensure output directories exist
  try {
    await ensureOutputDirs();
    console.log('✓ Output directories ready');
  } catch (error) {
    console.error('✗ Failed to create output directories:', error);
    process.exit(1);
  }
  
  // Create Express app
  const app = createApp();
  
  // Start listening
  app.listen(config.port, () => {
    console.log(`✓ Server running on http://localhost:${config.port}`);
    console.log('');
    console.log('API Endpoints:');
    console.log(`  GET  /api/health             - Health check`);
    console.log(`  POST /api/podcast            - Generate podcast`);
    console.log(`  GET  /api/podcast/:id        - Get podcast metadata`);
    console.log(`  GET  /api/podcast/:id/audio  - Download audio`);
    console.log(`  GET  /api/podcast/:id/script - Get script`);
    console.log('');
    
    if (isDevelopment()) {
      console.log('Development mode - CORS enabled for localhost:5173');
    }
  });
}

// Run server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { createApp };

