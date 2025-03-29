import { Card } from "@/components/ui/card";
import { SearchResult } from "@shared/schema";
import { format } from "date-fns";
import { ja } from 'date-fns/locale';

interface EpisodeCardProps {
  result: SearchResult;
}

// 特定の定型文を含むかチェックする関数
const containsStandardText = (content: string): boolean => {
  const standardPhrases = [
    "番組への感想や質問",
    "こちら</a>から（Google Form",
    "お気軽にメッセージください",
    "次回は",
    "公開予定です"
  ];
  
  return standardPhrases.some(phrase => content.includes(phrase));
};

// チャプターっぽいタイトルかをチェックする関数
const isChapterTitle = (title: string): boolean => {
  // 「はじめに」「おわりに」などのチャプタータイトルを検出
  const chapterTitles = [
    "はじめに", "おわりに", "チャプター", "イントロ", "まとめ", 
    "アウトロ", "Chapter", "Intro", "Outro"
  ];
  
  return chapterTitles.some(chapterTitle => 
    title.includes(chapterTitle) || 
    // 短すぎるタイトルもチャプターの可能性が高い
    (title.length < 5 && !title.includes("http"))
  );
};

// HTML文字列からリンクを抽出する関数
const extractLinks = (htmlContent: string): { text: string; url: string }[] => {
  const links: { text: string; url: string }[] = [];
  const regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
  
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    const url = match[2];
    const text = match[3].replace(/<[^>]*>/g, '').trim();
    
    // URLと表示テキストが同じ場合はURLだけ表示
    links.push({
      text: text || url,
      url: url
    });
  }
  
  return links;
};

export default function EpisodeCard({ result }: EpisodeCardProps) {
  const { episode, showNotes: notes } = result;

  // Format the publication date
  const formattedDate = format(new Date(episode.publicationDate), 'yyyy年MM月dd日', { locale: ja });
  const shortDate = format(new Date(episode.publicationDate), 'yyyy/MM/dd', { locale: ja });
  
  // 表示対象のショーノートを抽出する
  const filteredNotes = notes.filter(note => 
    !isChapterTitle(note.title) && 
    !containsStandardText(note.content || '')
  );
  
  // 各ショーノートからリンクを抽出
  const allLinks = filteredNotes.flatMap(note => 
    extractLinks(note.content || '')
  );
  
  // 重複リンクを削除
  const uniqueLinks = allLinks.filter((link, index, self) => 
    index === self.findIndex(l => l.url === link.url)
  );
  
  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        {/* Episode Header */}
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-4">
            <div className="w-16 h-16 bg-primaryLight rounded-md flex items-center justify-center">
              <span className="text-primary font-bold text-xl">#{episode.number}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {episode.title}
            </h3>
            <div className="flex flex-wrap items-center text-sm text-gray-500 mb-2">
              <span>{formattedDate}</span>
              {episode.duration && (
                <>
                  <span className="mx-2">•</span>
                  <span>{episode.duration}</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {episode.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primaryLight text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* Show Notes Section - リンク箇条書き表示 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="font-medium text-gray-700 mb-3">参考リンク</h4>
          {uniqueLinks.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {uniqueLinks.map((link, index) => (
                <li key={index} className="text-gray-800">
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">このエピソードに参考リンクはありません。</p>
          )}
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
            <a href={episode.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-secondary font-medium">
              エピソードを聴く 
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="inline-block ml-1 h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </a>
            <span className="text-xs text-gray-400">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="inline-block mr-1 h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {shortDate}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
