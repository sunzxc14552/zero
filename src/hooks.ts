import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category, SearchResult } from './types'
import { search, SearchError } from './search'

const HISTORY_KEY = 'auto-search-history'
const MAX_HISTORY = 8

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }, [])

  return { history, addToHistory, clearHistory }
}

export function useAutoSearch(category: Category, debounceMs = 350) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const id = ++requestId.current

    if (!query.trim()) {
      setResult(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const data = await search(query, category)
        if (id === requestId.current) {
          setResult(data)
          setLoading(false)
        }
      } catch (err) {
        if (id === requestId.current) {
          const message = err instanceof SearchError ? err.message : '搜索失败，请稍后重试'
          setError(message)
          setLoading(false)
        }
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, category, debounceMs])

  return { query, setQuery, result, loading, error }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
