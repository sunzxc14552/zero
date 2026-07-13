import type { Category, SearchItem, SearchResult } from '../src/types'

const WSA_API_URL = 'https://api.wsa.cloud.tencent.com/SearchPro'

interface TencentPage {
  title?: string
  url?: string
  date?: string
  passage?: string
  content?: string
  site?: string
  favicon?: string
  score?: number
}

interface TencentSearchResponse {
  Response?: {
    Query?: string
    Pages?: string[]
    Msg?: string
    RequestId?: string
    Error?: {
      Code?: string
      Message?: string
    }
  }
}

const VIDEO_DOMAINS = ['bilibili.com', 'youtube.com', 'youku.com', 'iqiyi.com', 'v.qq.com']
const TOOL_DOMAINS = ['github.com', 'npmjs.com', 'pypi.org', 'stackoverflow.com']
const NEWS_DOMAINS = ['news.', 'xinhuanet.com', 'people.com.cn', 'thepaper.cn', '36kr.com', 'qq.com']

function inferCategory(url: string, site = ''): SearchItem['category'] {
  const lower = `${url} ${site}`.toLowerCase()
  if (VIDEO_DOMAINS.some((d) => lower.includes(d))) return 'video'
  if (TOOL_DOMAINS.some((d) => lower.includes(d))) return 'tool'
  if (NEWS_DOMAINS.some((d) => lower.includes(d))) return 'news'
  return 'article'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  } catch {
    return dateStr.slice(0, 10)
  }
}

function parsePage(raw: string, index: number): SearchItem | null {
  try {
    const page = JSON.parse(raw) as TencentPage
    if (!page.title || !page.url) return null

    const category = inferCategory(page.url, page.site)
    return {
      id: page.url || String(index),
      title: page.title,
      description: page.passage || page.content || '',
      category,
      tags: page.site ? [page.site] : [],
      url: page.url,
      date: formatDate(page.date),
      siteName: page.site,
      siteIcon: page.favicon,
    }
  } catch {
    return null
  }
}

function filterByCategory(items: SearchItem[], category: Category): SearchItem[] {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

function industryForCategory(_category: Category): string | undefined {
  return undefined
}

export async function tencentWebSearch(
  apiKey: string,
  query: string,
  category: Category = 'all',
): Promise<SearchResult> {
  const start = performance.now()
  const trimmed = query.trim()
  const key = apiKey.trim()

  if (!trimmed) {
    return { items: [], total: 0, query: '', took: 0 }
  }

  if (!key) {
    throw new Error('未配置 API Key，请在 .env 中设置 SEARCH_API_KEY')
  }

  const body: Record<string, unknown> = {
    Query: trimmed,
    Mode: 0,
  }

  const response = await fetch(WSA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as TencentSearchResponse
  const resp = data.Response

  if (resp?.Error) {
    const code = resp.Error.Code ?? ''
    const msg = resp.Error.Message ?? '搜索服务异常'

    if (code === 'UnauthorizedOperation') {
      throw new Error(`API Key 鉴权失败 (${code})，请确认密钥来自腾讯云联网搜索控制台`)
    }
    if (code === 'ResourceUnavailable') {
      throw new Error('账户余额不足或服务不可用，请前往腾讯云控制台检查')
    }
    if (code === 'ResourceNotFound') {
      throw new Error('未开通联网搜索服务，请前往腾讯云控制台开通')
    }

    throw new Error(msg)
  }

  if (!response.ok) {
    throw new Error(`腾讯云搜索 API 错误 (${response.status})`)
  }

  const pages = resp?.Pages ?? []
  const items = filterByCategory(
    pages.map(parsePage).filter((item): item is SearchItem => item !== null),
    category,
  )

  return {
    items,
    total: items.length,
    query: trimmed,
    took: Math.round(performance.now() - start),
  }
}
