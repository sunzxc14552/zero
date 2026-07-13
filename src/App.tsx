import { useState } from 'react'
import type { Category } from './types'
import { useAutoSearch, useSearchHistory } from './hooks'
import { SearchBar } from './components/SearchBar'
import { CategoryFilter } from './components/CategoryFilter'
import { SearchResults } from './components/SearchResults'

export default function App() {
  const [category, setCategory] = useState<Category>('all')
  const { query, setQuery, result, loading, error } = useAutoSearch(category)
  const { history, addToHistory, clearHistory } = useSearchHistory()

  function handleSearch(q: string) {
    if (q.trim()) {
      addToHistory(q)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="logo-text">
              <h1>智搜</h1>
              <span className="logo-sub">Auto Search</span>
            </div>
          </div>
          <p className="header-desc">联网搜索 · 实时结果 · 博查搜索引擎驱动</p>
        </div>
      </header>

      <main className="main">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          loading={loading}
          history={history}
          onClearHistory={clearHistory}
        />

        <CategoryFilter active={category} onChange={setCategory} />

        {error && <div className="error-banner">{error}</div>}

        <SearchResults
          items={result?.items ?? []}
          query={query}
          took={result?.took ?? 0}
          total={result?.total ?? 0}
          loading={loading && !!query.trim()}
        />
      </main>

      <footer className="footer">
        <p>智搜 · GitHub Pages · 博查搜索引擎驱动</p>
      </footer>
    </div>
  )
}
