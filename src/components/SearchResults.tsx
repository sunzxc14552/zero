import type { ReactNode } from 'react'
import type { SearchItem } from '../types'

const CATEGORY_LABELS: Record<SearchItem['category'], string> = {
  article: '文章',
  video: '视频',
  tool: '工具',
  news: '资讯',
}

interface SearchResultsProps {
  items: SearchItem[]
  query: string
  took: number
  total: number
  loading: boolean
}

function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="highlight">{part}</mark>
    ) : (
      part
    ),
  )
}

export function SearchResults({ items, query, took, total, loading }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="results-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line title" />
            <div className="skeleton-line desc" />
            <div className="skeleton-line desc short" />
            <div className="skeleton-tags">
              <div className="skeleton-tag" />
              <div className="skeleton-tag" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <h3>开始搜索</h3>
        <p>输入关键词即可自动搜索，无需按回车</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3>未找到相关结果</h3>
        <p>试试其他关键词，或切换分类筛选</p>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="results-meta">
        找到 <strong>{total}</strong> 条结果
        <span className="results-took">（{took}ms）</span>
      </div>
      <div className="results-list">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            className="result-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="result-header">
              <span className={`result-category cat-${item.category}`}>
                {CATEGORY_LABELS[item.category]}
              </span>
              <span className="result-date">{item.date}</span>
            </div>
            <div className="result-title-row">
              {item.siteIcon && (
                <img src={item.siteIcon} alt="" className="result-favicon" />
              )}
              <h3 className="result-title">{highlightText(item.title, query)}</h3>
            </div>
            <p className="result-url">{item.url}</p>
            <p className="result-desc">{highlightText(item.description, query)}</p>
            <div className="result-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="result-tag">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
