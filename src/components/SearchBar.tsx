import { useEffect, useRef, useState } from 'react'
import { getSuggestions } from '../search'
import { HOT_KEYWORDS } from '../data'

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  onSearch: (query: string) => void
  loading: boolean
  history: string[]
  onClearHistory: () => void
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  loading,
  history,
  onClearHistory,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions = query.trim()
    ? getSuggestions(query, history)
    : []

  const dropdownItems = query.trim()
    ? suggestions
    : [...history, ...HOT_KEYWORDS.filter((k: string) => !history.includes(k))].slice(0, 8)

  const showDropdown = focused && dropdownItems.length > 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectItem(item: string) {
    onQueryChange(item)
    onSearch(item)
    setFocused(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, dropdownItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectItem(dropdownItems[activeIndex])
    } else if (e.key === 'Escape') {
      setFocused(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="search-bar" ref={wrapperRef}>
      <div className={`search-input-wrapper ${focused ? 'focused' : ''}`}>
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="输入关键词，自动搜索..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <div className="search-spinner" aria-label="搜索中">
            <div className="spinner" />
          </div>
        )}
        {query && !loading && (
          <button
            className="clear-btn"
            onClick={() => {
              onQueryChange('')
              inputRef.current?.focus()
            }}
            aria-label="清除"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {!query.trim() && history.length > 0 && (
            <div className="dropdown-header">
              <span>搜索历史</span>
              <button onClick={onClearHistory}>清除</button>
            </div>
          )}
          {!query.trim() && history.length === 0 && (
            <div className="dropdown-header">
              <span>热门搜索</span>
            </div>
          )}
          {query.trim() && suggestions.length > 0 && (
            <div className="dropdown-header">
              <span>搜索建议</span>
            </div>
          )}
          <ul className="dropdown-list">
            {dropdownItems.map((item: string, i: number) => (
              <li key={`${item}-${i}`}>
                <button
                  className={`dropdown-item ${i === activeIndex ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectItem(item)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {history.includes(item) && !query.trim() ? (
                      <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    ) : (
                      <>
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </>
                    )}
                  </svg>
                  <span>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
