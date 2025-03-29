import express from 'express';
import { log, setupVite, serveStatic } from './vite';
import { registerRoutes } from './routes';

// Import adapter to integrate Hono with Express
import { getHonoApp } from './adapter';

async function main() {
  log('Starting server...');

  const app = express();
  
  // Parse JSON body
  app.use(express.json());
  
  // Setup routes
  const server = await registerRoutes(app);
  
  // Get a reference to the Hono app
  const honoApp = getHonoApp();
  log('Hono app initialized');
  
  // In development, setup Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    log('Setting up Vite development server');
    await setupVite(app, server);
  } else {
    // In production, serve static files
    serveStatic(app);
  }
  
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  server.listen(port, '0.0.0.0', () => {
    log(`Server running on port ${port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
