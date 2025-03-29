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
  updateEpisode(episode: Episode): Promise<Episode>;
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
    
    // Ensure episodeData.number is never empty
    if (!episodeData.number || episodeData.number === 'N/A') {
      console.log(`WARNING: エピソード番号が設定されていません。ID=${id}のエピソード`);
      
      // Extract episode number from title if possible
      const numberMatch = episodeData.title.match(/#(\d+)/);
      if (numberMatch) {
        episodeData.number = numberMatch[1];
        console.log(`エピソード番号を抽出しました: ${episodeData.number}`);
      } else {
        // Use ID as a fallback
        episodeData.number = `${id}`;
        console.log(`エピソード番号にIDを使用します: ${episodeData.number}`);
      }
    }
    
    // nullを明示的に設定して型エラーを回避
    const episode: Episode = {
      id,
      number: episodeData.number,
      guid: episodeData.guid,
      title: episodeData.title,
      description: episodeData.description || null,
      audioUrl: episodeData.audioUrl || null,
      publicationDate: episodeData.publicationDate,
      duration: episodeData.duration || null,
      url: episodeData.url,
      tags: (episodeData.tags && Array.isArray(episodeData.tags)) 
        ? [...episodeData.tags].map(tag => String(tag)) 
        : [] as string[]
    };
    
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
    
    // 個別にプロパティを指定して型エラーを回避
    const showNote: ShowNote = {
      id,
      title: showNoteData.title,
      episodeId: showNoteData.episodeId,
      content: showNoteData.content || null,
      timestamp: showNoteData.timestamp || null
    };
    
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
    console.log(`検索開始: "${query}"`);
    
    // エピソードとその番号を収集
    const allEpisodes = Array.from(this.episodes.values());
    const episodeNumbers = allEpisodes.map(e => e.number);
    console.log(`全エピソード番号: ${episodeNumbers.slice(0, 5).join(', ')}... (合計 ${episodeNumbers.length} 件)`);
    
    // Search through episodes and their show notes
    for (const episode of allEpisodes) {
      // エピソード番号
      const episodeNumber = episode.number;
      
      // マッチしたかどうか
      let hasMatch = false;
      
      // Show notesを取得
      const showNotes = Array.from(this.showNotes.values()).filter(
        note => note.episodeId === episode.id
      );
      
      // エピソードタイトルをチェック
      const episodeTitleMatch = episode.title.toLowerCase().includes(normalizedQuery);
      if (episodeTitleMatch) {
        hasMatch = true;
      }
      
      // ショーノートのタイトルをチェック
      const hasShowNoteTitleMatch = showNotes.some(note => 
        note.title && note.title.toLowerCase().includes(normalizedQuery)
      );
      if (hasShowNoteTitleMatch) {
        hasMatch = true;
      }
      
      // ショーノートの内容をチェック
      const hasShowNoteContentMatch = showNotes.some(note => 
        note.content && note.content.toLowerCase().includes(normalizedQuery)
      );
      if (hasShowNoteContentMatch) {
        hasMatch = true;
      }
      
      // リンクを検索するために全ショーノートのコンテンツを結合
      const allNotesContent = showNotes.map(note => note.content || '').join(' ');
      
      // リンクテキストを抽出
      const linkTexts: string[] = [];
      
      // アンカータグからリンクテキストを抽出
      const anchorRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
      let anchorMatch;
      while ((anchorMatch = anchorRegex.exec(allNotesContent)) !== null) {
        const linkText = anchorMatch[3].replace(/<[^>]*>/g, '').trim();
        if (linkText) {
          linkTexts.push(linkText);
        }
      }
      
      // URLパターンを見つけるための別の方法（プレーンテキストのURL）
      const urlPattern = /(https?:\/\/[^\s"'<>]+)/g;
      let urlMatch;
      while ((urlMatch = urlPattern.exec(allNotesContent)) !== null) {
        const url = urlMatch[1];
        linkTexts.push(url);
      }
      
      // リンクテキストが検索クエリにマッチするか確認
      const hasMatchingLinkText = linkTexts.some(text => 
        text.toLowerCase().includes(normalizedQuery)
      );
      
      if (hasMatchingLinkText) {
        hasMatch = true;
      }
      
      // マッチするショーノートを探す
      const matchedShowNotes = showNotes.map(note => {
        const titleMatched = note.title && note.title.toLowerCase().includes(normalizedQuery);
        const contentMatched = note.content && note.content.toLowerCase().includes(normalizedQuery);
        const linkMatched = linkTexts.some(text => 
          text.toLowerCase().includes(normalizedQuery) && 
          (note.content || '').includes(text)
        );
        
        // Add a non-persisted property to indicate if this note matched the search
        return {
          ...note,
          matched: titleMatched || contentMatched || linkMatched
        };
      });
      
      // エピソード情報をログに出力（特定のエピソードの場合）
      if (["292", "278", "109"].includes(episodeNumber)) {
        console.log(`\nエピソード #${episodeNumber} の検索結果:`);
        console.log(`タイトル: ${episode.title}`);
        console.log(`エピソードタイトルマッチ: ${episodeTitleMatch}`);
        console.log(`ショーノートタイトルマッチ: ${hasShowNoteTitleMatch}`);
        console.log(`ショーノート内容マッチ: ${hasShowNoteContentMatch}`);
        console.log(`リンクテキストマッチ: ${hasMatchingLinkText}`);
        console.log(`最終マッチ結果: ${hasMatch}`);
      }
      
      // エピソードタイトルかショーノートかリンクがマッチした場合のみ結果に追加
      if (hasMatch) {
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

  async updateEpisode(episode: Episode): Promise<Episode> {
    if (!this.episodes.has(episode.id)) {
      throw new Error(`Episode with ID ${episode.id} not found.`);
    }
    
    this.episodes.set(episode.id, episode);
    return episode;
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
