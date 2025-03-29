import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center">
              <svg 
                className="h-8 w-auto"
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="24" height="24" rx="12" fill="#4F46E5" />
                <path d="M7 12H17M7 8H13M7 16H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h1 className="ml-3 text-xl font-semibold text-gray-900">ショーノート検索</h1>
            </a>
          </Link>
          <a href="https://ossan.fm/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-secondary text-sm font-medium">
            公式サイトへ 
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
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
