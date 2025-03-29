import { Hono } from 'hono';
import type { Express, Request, Response, NextFunction } from 'express';
import app from './hono';
import { log } from './vite';

// This adapter allows the Hono app to run alongside the express app
// and handle API requests while express handles the static files and client-side routing
export function setupHonoAdapter(expressApp: Express) {
  log('Setting up Hono adapter for API routes');
  
  // Use Hono app for API routes
  expressApp.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    try {
      log(`Processing API request: ${req.method} ${req.path}`);
      
      // Fix the URL by making sure it includes the full path
      // Express sometimes has req.url as just the path after the route prefix
      const fullPath = req.originalUrl || req.url;
      const host = req.headers.host || 'localhost:5000';
      const url = new URL(fullPath, `http://${host}`);
      
      log(`Sending request to Hono: ${url.toString()}`);
      
      const method = req.method;
      
      // Prepare headers
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.append(key, value);
          }
        }
      }
      
      // Prepare body
      let body: any = undefined;
      if (method !== 'GET' && method !== 'HEAD' && req.body) {
        body = JSON.stringify(req.body);
        headers.set('Content-Type', 'application/json');
      }

      // Create fetch request
      const request = new Request(url.toString(), {
        method,
        headers,
        body,
      });

      // Process with Hono
      const honoResponse = await app.fetch(request);
      
      log(`Hono response status: ${honoResponse.status}`);
      
      // Convert Hono response to express response
      res.status(honoResponse.status);
      
      // Set headers
      honoResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      // Send body
      const bodyText = await honoResponse.text();
      res.send(bodyText);
    } catch (error) {
      console.error('Error in Hono adapter:', error);
      next(error);
    }
  });

  return expressApp;
}

// Get a reference to Hono app
export function getHonoApp(): Hono {
  return app;
}