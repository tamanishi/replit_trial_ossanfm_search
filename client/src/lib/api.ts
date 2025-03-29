import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { SearchResult, searchResultSchema } from "@shared/schema";

export async function searchEpisodes(query: string): Promise<SearchResult[]> {
  const response = await apiRequest(
    "GET",
    `/api/search?q=${encodeURIComponent(query)}`,
    undefined
  );
  
  const data = await response.json();
  return z.array(searchResultSchema).parse(data);
}

export async function getEpisodes(limit: number = 10, offset: number = 0): Promise<SearchResult[]> {
  const response = await apiRequest(
    "GET",
    `/api/episodes?limit=${limit}&offset=${offset}`,
    undefined
  );
  
  const data = await response.json();
  return z.array(searchResultSchema).parse(data);
}

export async function refreshPodcastData(): Promise<{ success: boolean; message: string }> {
  const response = await apiRequest("GET", "/api/refresh", undefined);
  return response.json();
}
