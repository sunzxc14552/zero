import type { Category, SearchResult } from './types'
import { bochaWebSearch } from './lib/bocha-search'

export class SearchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SearchError'
  }
}

const apiKey = import.meta.env.VITE_SEARCH_API_KEY as string | undefined
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

function shouldUseLocalProxy(): boolean {
  if (import.meta.env.PROD) return false
  if (typeof window === 'undefined') return import.meta.env.DEV

  const host = window.location.hostname
  return import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1')
}

async function searchViaProxy(endpoint: string, query: string, category: Category): Promise<SearchResult> {
  const start = performance.now()
  const params = new URLSearchParams({ q: query, cat: category })
  const res = await fetch(`${endpoint}/api/search?${params}`)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new SearchError(body.error || `搜索请求失败 (${res.status})`)
  }

  const data = (await res.json()) as SearchResult
  return {
    ...data,
    took: data.took || Math.round(performance.now() - start),
  }
}

async function searchDirect(query: string, category: Category): Promise<SearchResult> {
  if (!apiKey?.trim()) {
    throw new SearchError(
      '未配置搜索代理。请按 worker/README.md 部署 Cloudflare Worker，并在 GitHub Secrets 中添加 VITE_API_URL',
    )
  }

  try {
    return await bochaWebSearch(apiKey, query, category)
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败'
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      throw new SearchError(
        '浏览器跨域限制，请部署 Cloudflare Worker 代理并在 GitHub Secrets 中设置 VITE_API_URL',
      )
    }
    throw new SearchError(message)
  }
}

export async function search(query: string, category: Category = 'all'): Promise<SearchResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { items: [], total: 0, query: '', took: 0 }
  }

  if (shouldUseLocalProxy()) {
    return searchViaProxy('', trimmed, category)
  }

  if (apiUrl) {
    return searchViaProxy(apiUrl, trimmed, category)
  }

  return searchDirect(trimmed, category)
}

export function getSuggestions(query: string, history: string[] = [], limit = 6): string[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const suggestions = new Set<string>()

  for (const item of history) {
    if (item.toLowerCase().includes(q)) {
      suggestions.add(item)
    }
    if (suggestions.size >= limit) break
  }

  return Array.from(suggestions).slice(0, limit)
}
