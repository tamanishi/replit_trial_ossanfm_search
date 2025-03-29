import { ChangeEvent, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ searchQuery, setSearchQuery, isSearching }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(searchQuery);
  
  // Debounce search to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [inputValue, setSearchQuery]);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-gray-400" 
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
      </div>
      <Input 
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
        placeholder="キーワードを入力してください..."
        autoComplete="off"
      />
      {isSearching && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
