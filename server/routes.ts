import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";

// Cache for storing fetched podcast data to avoid excessive API calls
const cache = {
  lastFetch: 0,
  data: null as any,
  CACHE_DURATION: 30 * 60 * 1000 // 30 minutes
};

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Endpoint to fetch and process podcast data
  app.get('/api/refresh', async (req, res) => {
    try {
      await fetchAndProcessPodcastData();
      res.json({ success: true, message: 'Podcast data refreshed successfully' });
    } catch (error) {
      console.error('Error refreshing podcast data:', error);
      res.status(500).json({ success: false, message: 'Failed to refresh podcast data' });
    }
  });

  // Endpoint to search episodes
  app.get('/api/search', async (req, res) => {
    try {
      const query = z.string().optional().parse(req.query.q);
      const results = await storage.searchEpisodes(query || '');
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Failed to execute search' });
    }
  });

  // Endpoint to get latest episodes
  app.get('/api/episodes', async (req, res) => {
    try {
      const limitSchema = z.coerce.number().min(1).max(50).default(10);
      const offsetSchema = z.coerce.number().min(0).default(0);
      
      const limit = limitSchema.parse(req.query.limit);
      const offset = offsetSchema.parse(req.query.offset);
      
      const episodes = await storage.getLatestEpisodes(limit, offset);
      res.json(episodes);
    } catch (error) {
      console.error('Error fetching episodes:', error);
      res.status(500).json({ message: 'Failed to fetch episodes' });
    }
  });

  // Function to fetch and process podcast data
  async function fetchAndProcessPodcastData() {
    const now = Date.now();
    
    // Check if we need to refresh the cache
    if (cache.data && now - cache.lastFetch < cache.CACHE_DURATION) {
      return cache.data;
    }
    
    // Fetch the RSS feed
    const response = await fetch('https://ossan.fm/feed.xml');
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xml = await response.text();
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const result = parser.parse(xml);
    
    // Process channel items (episodes)
    const items = result.rss.channel.item;
    
    for (const item of items) {
      // Parse episode data
      const guid = item.guid ? item.guid['#text'] || item.guid : '';
      
      // Check if episode already exists
      const existingEpisodes = await storage.getEpisodes();
      const existingEpisode = existingEpisodes.find(ep => ep.guid === guid);
      
      if (!existingEpisode) {
        // Extract episode number from title (e.g., "#123 ...")
        const numberMatch = item.title.match(/#(\d+)/);
        const number = numberMatch ? numberMatch[1] : '';
        
        // Extract tags from categories
        const categories = Array.isArray(item.category) 
          ? item.category 
          : (item.category ? [item.category] : []);
          
        // Create episode
        const episode = await storage.createEpisode({
          guid,
          number: number || 'N/A',
          title: item.title,
          description: item.description || '',
          audioUrl: item.enclosure?.["@_url"] || '',
          publicationDate: new Date(item.pubDate),
          duration: item['itunes:duration'] || '',
          url: item.link || `https://ossan.fm/ep/${number}`,
          tags: categories
        });
        
        // Parse and store show notes from description
        if (item.description) {
          // This is a simple example - real implementation may need more sophisticated parsing
          // Depending on the actual format of the show notes in the description
          const sections = item.description.split('<h2>');
          
          for (const section of sections) {
            if (!section.trim()) continue;
            
            // Try to extract title from h2 tag
            const titleMatch = section.match(/(.*?)<\/h2>/);
            if (titleMatch) {
              const title = titleMatch[1].trim();
              const content = section.replace(titleMatch[0], '').trim();
              
              // Try to extract timestamp if present
              const timeMatch = content.match(/(\d{1,2}:\d{2}:\d{2})/);
              const timestamp = timeMatch ? timeMatch[1] : null;
              
              await storage.createShowNote({
                title,
                content,
                timestamp: timestamp || null,
                episodeId: episode.id
              });
            }
          }
        }
      }
    }
    
    // Update cache
    cache.data = result;
    cache.lastFetch = now;
    
    return result;
  }
  
  // Initially fetch podcast data when server starts
  fetchAndProcessPodcastData().catch(error => {
    console.error('Initial podcast data fetch failed:', error);
  });

  const httpServer = createServer(app);

  return httpServer;
}
