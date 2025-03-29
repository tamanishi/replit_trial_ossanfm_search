import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupHonoAdapter } from "./adapter";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Use the Hono adapter to handle API routes
  log("Setting up Hono adapter for API routes");
  setupHonoAdapter(app);
  
  // The adapter will handle all API routes
  // No need to define Express routes for APIs anymore

  const httpServer = createServer(app);

  return httpServer;
}
