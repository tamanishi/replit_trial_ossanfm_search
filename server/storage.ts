import { 
  type Episode, 
  type ShowNote, 
  type InsertEpisode, 
  type InsertShowNote,
  type SearchResult
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getEpisodes(): Promise<Episode[]>;
  getEpisode(id: number): Promise<Episode | undefined>;
  createEpisode(episode: InsertEpisode): Promise<Episode>;
  getShowNotes(episodeId: number): Promise<ShowNote[]>;
  createShowNote(showNote: InsertShowNote): Promise<ShowNote>;
  searchEpisodes(query: string): Promise<SearchResult[]>;
  getLatestEpisodes(limit: number, offset: number): Promise<SearchResult[]>;
}

export class MemStorage implements IStorage {
  private episodes: Map<number, Episode>;
  private showNotes: Map<number, ShowNote>;
  private episodeIdCounter: number;
  private showNoteIdCounter: number;

  constructor() {
    this.episodes = new Map();
    this.showNotes = new Map();
    this.episodeIdCounter = 1;
    this.showNoteIdCounter = 1;
  }

  async getEpisodes(): Promise<Episode[]> {
    return Array.from(this.episodes.values());
  }

  async getEpisode(id: number): Promise<Episode | undefined> {
    return this.episodes.get(id);
  }

  async createEpisode(episodeData: InsertEpisode): Promise<Episode> {
    const id = this.episodeIdCounter++;
    const episode: Episode = { ...episodeData, id };
    this.episodes.set(id, episode);
    return episode;
  }

  async getShowNotes(episodeId: number): Promise<ShowNote[]> {
    return Array.from(this.showNotes.values()).filter(
      showNote => showNote.episodeId === episodeId
    );
  }

  async createShowNote(showNoteData: InsertShowNote): Promise<ShowNote> {
    const id = this.showNoteIdCounter++;
    const showNote: ShowNote = { ...showNoteData, id };
    this.showNotes.set(id, showNote);
    return showNote;
  }

  async searchEpisodes(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      // Return most recent episodes when no query
      return this.getLatestEpisodes(10, 0);
    }

    const normalizedQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Search through episodes and their show notes
    for (const episode of this.episodes.values()) {
      const showNotes = Array.from(this.showNotes.values()).filter(
        note => note.episodeId === episode.id
      );
      
      const episodeTitleMatch = episode.title.toLowerCase().includes(normalizedQuery);
      
      // Match show notes and mark which ones matched
      const matchedShowNotes = showNotes.map(note => {
        const titleMatched = note.title.toLowerCase().includes(normalizedQuery);
        // Add a non-persisted property to indicate if this note matched the search
        return {
          ...note,
          matched: titleMatched
        };
      });
      
      const hasMatchingShowNotes = matchedShowNotes.some(note => note.matched);
      
      if (episodeTitleMatch || hasMatchingShowNotes) {
        results.push({
          episode,
          showNotes: matchedShowNotes,
          highlighted: {
            episodeTitle: episodeTitleMatch,
            query: query // Include original query for highlighting
          }
        });
      }
    }
    
    // Sort results by publication date (most recent first)
    return results.sort((a, b) => 
      b.episode.publicationDate.getTime() - a.episode.publicationDate.getTime()
    );
  }

  async getLatestEpisodes(limit: number, offset: number): Promise<SearchResult[]> {
    const sortedEpisodes = Array.from(this.episodes.values())
      .sort((a, b) => b.publicationDate.getTime() - a.publicationDate.getTime())
      .slice(offset, offset + limit);
    
    return Promise.all(sortedEpisodes.map(async episode => {
      const showNotes = await this.getShowNotes(episode.id);
      // 検索結果ではない場合は matched を false に設定
      const processedShowNotes = showNotes.map(note => ({
        ...note,
        matched: false
      }));
      
      return {
        episode,
        showNotes: processedShowNotes,
        highlighted: { episodeTitle: false, query: "" }
      };
    }));
  }
}

export const storage = new MemStorage();
