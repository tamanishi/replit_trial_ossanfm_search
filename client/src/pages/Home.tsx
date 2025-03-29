import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import EpisodeCard from "@/components/EpisodeCard";
import Footer from "@/components/Footer";
import { SearchResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const { toast } = useToast();

  // Initial fetch of episodes to show latest ones before search
  const initialLoad = useQuery({
    queryKey: ['/api/episodes', displayCount],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/episodes?limit=${displayCount}`, undefined);
      return res.json() as Promise<SearchResult[]>;
    },
    enabled: searchQuery === ""
  });

  // Search query
  const searchResults = useQuery({
    queryKey: ['/api/search', searchQuery],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/search?q=${encodeURIComponent(searchQuery)}`, undefined);
      return res.json() as Promise<SearchResult[]>;
    },
    enabled: searchQuery !== "",
  });

  // Initial data refresh
  useEffect(() => {
    const refreshData = async () => {
      try {
        await apiRequest('GET', '/api/refresh', undefined);
      } catch (error) {
        toast({
          title: "データ取得エラー",
          description: "ポッドキャストデータの取得中にエラーが発生しました。しばらくしてからもう一度お試しください。",
          variant: "destructive"
        });
      }
    };
    
    refreshData();
  }, [toast]);

  // Determine which results to show
  const results = searchQuery ? searchResults.data : initialLoad.data;
  const isLoading = searchQuery ? searchResults.isLoading : initialLoad.isLoading;
  const hasMoreResults = results && results.length >= displayCount;

  // Handler for load more button
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        <section className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Ossan.fmのエピソードとショーノートを検索</h2>
            <SearchBar 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              isSearching={searchResults.isLoading} 
            />
            <p className="mt-2 text-sm text-gray-500">
              エピソードのタイトル、ショーノートのタイトル、および参考リンクのテキストが検索対象です
            </p>
          </div>
        </section>

        <section id="results-section">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin mx-auto h-12 w-12 text-primary">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                </svg>
              </div>
              <p className="mt-4 text-gray-600">エピソードを読み込んでいます...</p>
            </div>
          )}
          
          {/* No Results State */}
          {!isLoading && results && results.length === 0 && searchQuery !== "" && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mx-auto h-16 w-16 text-gray-300 mb-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                「<span className="text-primary">{searchQuery}</span>」に一致する結果がありません
              </h3>
              <p className="text-gray-500">
                別のキーワードを試してみてください。<br />
                エピソードのタイトル、ショーノートのタイトル、および参考リンクのテキストが検索対象です。
              </p>
            </div>
          )}
          
          {/* Results List */}
          {!isLoading && results && results.length > 0 && (
            <div className="space-y-6">
              {results.map((result) => (
                <EpisodeCard key={result.episode.id} result={result} />
              ))}
            </div>
          )}
        </section>

        {/* Load More Button */}
        {!isLoading && hasMoreResults && (
          <div className="mt-8 text-center">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={handleLoadMore}
            >
              もっと見る
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="ml-2 h-4 w-4" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
