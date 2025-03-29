import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import fetch from 'node-fetch';
import { storage } from './storage';

// Create a new Hono instance
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Cache for storing fetched podcast data to avoid excessive API calls
const cache = {
  lastFetch: 0,
  data: null as any,
  CACHE_DURATION: 30 * 60 * 1000 // 30 minutes
};

// Helper function to get MIME type for static files
function getMimeType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

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
      // Extract episode number from title (e.g., "#123 ..." or "123. ...")
      let number = '';
      const hashNumberMatch = item.title.match(/#(\d+)/);
      const dotNumberMatch = item.title.match(/^(\d+)\./);
      
      if (dotNumberMatch && dotNumberMatch[1]) {
        // タイトルの先頭が "123." の形式
        number = dotNumberMatch[1];
      } else if (hashNumberMatch && hashNumberMatch[1]) {
        // タイトルに "#123" の形式
        number = hashNumberMatch[1];
      }
      
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

// API Routes
// Endpoint to fetch and process podcast data
app.get('/api/refresh', async (c) => {
  try {
    await fetchAndProcessPodcastData();
    
    // 全エピソードを取得して番号をログに出力
    const storage = await import('./storage').then(m => m.storage);
    const episodes = await storage.getEpisodes();
    
    // エピソード番号が設定されているか確認
    const episodeNumbers = episodes.map(e => e.number);
    console.log(`全エピソード番号（先頭5件）: ${episodeNumbers.slice(0, 5).join(', ')}... （合計 ${episodeNumbers.length} 件）`);
    
    // エラーチェックと修正
    let noNumberEpisodes = episodes.filter(e => !e.number || e.number === 'N/A');
    if (noNumberEpisodes.length > 0) {
      console.log(`警告: ${noNumberEpisodes.length} 件のエピソードに番号が設定されていません。`);
      
      // N/Aのエピソードのタイトルから番号を抽出して更新
      for (const episode of noNumberEpisodes) {
        if (episode.title) {
          // タイトルから番号を抽出
          const dotNumberMatch = episode.title.match(/^(\d+)\./);
          
          if (dotNumberMatch && dotNumberMatch[1]) {
            const extractedNumber = dotNumberMatch[1];
            console.log(`WARNING: エピソード番号が設定されていません。ID=${episode.id}のエピソード`);
            console.log(`エピソード番号にIDを使用します: ${extractedNumber}`);
            
            // エピソード番号を更新
            episode.number = extractedNumber;
            
            // エピソードをストレージに保存
            await storage.updateEpisode(episode);
          } else {
            console.log(`エピソード番号が抽出できません: ${episode.title}`);
          }
        }
      }
    }
    
    return c.json({ 
      success: true, 
      message: 'Podcast data refreshed successfully',
      episodeCount: episodes.length
    });
  } catch (error) {
    console.error('Error refreshing podcast data:', error);
    return c.json({ success: false, message: 'Failed to refresh podcast data' }, 500);
  }
});

// Endpoint to search episodes
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    console.log(`\n======= 検索クエリ: "${query}" =======`);
    
    const results = await storage.searchEpisodes(query);
    
    // 結果のエピソード番号をログに出力
    const resultNumbers = results.map(r => r.episode.number).join(', ');
    console.log(`\n検索結果のエピソード番号: ${resultNumbers}`);
    console.log(`検索結果の件数: ${results.length}`);
    console.log(`====== 検索終了 ======\n`);
    
    return c.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ message: 'Failed to execute search' }, 500);
  }
});

// Endpoint to get latest episodes
app.get('/api/episodes', async (c) => {
  try {
    const limitSchema = z.coerce.number().min(1).max(50).default(10);
    const offsetSchema = z.coerce.number().min(0).default(0);
    
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');
    
    const limit = limitSchema.parse(limitParam ? parseInt(limitParam) : 10);
    const offset = offsetSchema.parse(offsetParam ? parseInt(offsetParam) : 0);
    
    const episodes = await storage.getLatestEpisodes(limit, offset);
    return c.json(episodes);
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return c.json({ message: 'Failed to fetch episodes' }, 500);
  }
});

// デバッグ用エンドポイント - 特定のエピソードの詳細情報を取得
app.get('/api/debug-episode/:number', async (c) => {
  try {
    const number = c.req.param('number');
    
    // 全エピソードを取得
    const allEpisodes = await storage.getEpisodes();
    
    // 番号でエピソードを検索
    const episode = allEpisodes.find(ep => ep.number === number);
    
    if (!episode) {
      return c.json({ message: `エピソード #${number} が見つかりませんでした` }, 404);
    }
    
    // ショーノート情報を取得
    const showNotes = await storage.getShowNotes(episode.id);
    
    // リンクを抽出
    const links: {title: string, url: string, linkText: string}[] = [];
    
    for (const note of showNotes) {
      if (!note.content) continue;
      
      // アンカータグを探す
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
      let anchorMatch;
      
      while ((anchorMatch = anchorRegex.exec(note.content)) !== null) {
        const url = anchorMatch[2];
        const linkText = anchorMatch[3].replace(/<[^>]*>/g, '').trim();
        
        if (url && linkText) {
          links.push({
            title: note.title,
            url,
            linkText
          });
        }
      }
      
      // プレーンURLを探す
      const urlPattern = /(https?:\/\/[^\s"'<>]+)/g;
      let urlMatch;
      
      while ((urlMatch = urlPattern.exec(note.content)) !== null) {
        const url = urlMatch[1];
        
        if (url) {
          links.push({
            title: note.title,
            url,
            linkText: url
          });
        }
      }
    }
    
    // 検索クエリ「こども」が含まれるかチェック
    const testQuery = "こども";
    const containsQuery = {
      title: episode.title.toLowerCase().includes(testQuery.toLowerCase()),
      showNoteTitles: showNotes.some(note => note.title && note.title.toLowerCase().includes(testQuery.toLowerCase())),
      showNoteContents: showNotes.some(note => note.content && note.content.toLowerCase().includes(testQuery.toLowerCase())),
      links: links.some(link => link.linkText.toLowerCase().includes(testQuery.toLowerCase()))
    };
    
    return c.json({
      episode,
      showNotes,
      links,
      containsQuery
    });
  } catch (error) {
    console.error('Debug error:', error);
    return c.json({ message: 'デバッグ情報の取得に失敗しました' }, 500);
  }
});

// Initially fetch podcast data when server starts
fetchAndProcessPodcastData().catch(error => {
  console.error('Initial podcast data fetch failed:', error);
});

// This function exists only for compatibility with old code
// We now use the Express adapter instead of directly starting Hono
export function startServer(port: number = 5000) {
  console.log(`Hono app created - Using Express adapter instead of direct Hono server`);
  // We don't actually start a server here anymore
  return null;
}

export default app;