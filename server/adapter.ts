import { Hono } from 'hono';
import type { Express, Request, Response, NextFunction } from 'express';
import app from './hono';

// This adapter allows the Hono app to run alongside the express app
// and handle API requests while express handles the static files and client-side routing
export function setupHonoAdapter(expressApp: Express) {
  // Use Hono app only for API routes
  expressApp.use('/api/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert express request to fetch request
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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