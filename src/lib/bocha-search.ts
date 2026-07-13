import type { Category, SearchItem, SearchResult } from '../types'

const API_BASES = ['https://api.bocha.cn', 'https://api.bochaai.com']

interface BochaWebPage {
  id: string
  name: string
  url: string
  siteName?: string
  siteIcon?: string
  snippet?: string
  summary?: string
  datePublished?: string
}

interface BochaSearchResponse {
  type?: string
  code?: number | string
  message?: string
  data?: {
    webPages?: {
      totalEstimatedMatches?: number
      value?: BochaWebPage[]
    }
  }
  webPages?: {
    totalEstimatedMatches?: number
    value?: BochaWebPage[]
  }
}

const VIDEO_DOMAINS = ['bilibili.com', 'youtube.com', 'youku.com', 'iqiyi.com', 'v.qq.com']
const TOOL_DOMAINS = ['github.com', 'npmjs.com', 'pypi.org', 'stackoverflow.com']
const NEWS_DOMAINS = ['news.', 'xinhuanet.com', 'people.com.cn', 'thepaper.cn', '36kr.com']

function inferCategory(url: string, siteName = ''): SearchItem['category'] {
  const lower = `${url} ${siteName}`.toLowerCase()
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

function mapWebPage(page: BochaWebPage): SearchItem {
  const category = inferCategory(page.url, page.siteName)
  return {
    id: page.id || page.url,
    title: page.name,
    description: page.summary || page.snippet || '',
    category,
    tags: page.siteName ? [page.siteName] : [],
    url: page.url,
    date: formatDate(page.datePublished),
    siteName: page.siteName,
    siteIcon: page.siteIcon,
  }
}

function filterByCategory(items: SearchItem[], category: Category): SearchItem[] {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

function freshnessForCategory(category: Category): string {
  switch (category) {
    case 'news':
      return 'oneMonth'
    default:
      return 'noLimit'
  }
}

async function requestBocha(
  apiKey: string,
  query: string,
  category: Category,
  apiBase: string,
): Promise<{ webPages: NonNullable<BochaSearchResponse['data']>['webPages'] }> {
  const response = await fetch(`${apiBase}/v1/web-search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      summary: true,
      freshness: freshnessForCategory(category),
      count: 20,
    }),
  })

  const data = (await response.json()) as BochaSearchResponse

  if (data.type === 'error' || data.code === 401 || data.code === '401') {
    throw new Error(data.message || 'API 鉴权失败')
  }

  if (!response.ok) {
    throw new Error(data.message || `博查 API 错误 (${response.status})`)
  }

  const webPages = data.data?.webPages ?? data.webPages
  return { webPages }
}

export async function bochaWebSearch(
  apiKey: string,
  query: string,
  category: Category = 'all',
  apiBase = API_BASES[0],
): Promise<SearchResult> {
  const start = performance.now()
  const trimmed = query.trim()
  const key = apiKey.trim()

  if (!trimmed) {
    return { items: [], total: 0, query: '', took: 0 }
  }

  if (!key) {
    throw new Error('未配置 API Key')
  }

  const bases = [apiBase, ...API_BASES.filter((b) => b !== apiBase)]
  let lastError = 'API 请求失败'

  for (const base of bases) {
    try {
      const { webPages } = await requestBocha(key, trimmed, category, base)
      const pages = webPages?.value ?? []
      const items = filterByCategory(pages.map(mapWebPage), category)

      return {
        items,
        total: webPages?.totalEstimatedMatches ?? items.length,
        query: trimmed,
        took: Math.round(performance.now() - start),
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError
      if (lastError !== 'Invalid API KEY' && !lastError.includes('鉴权')) {
        throw err instanceof Error ? err : new Error(lastError)
      }
    }
  }

  throw new Error(
    lastError === 'Invalid API KEY'
      ? 'API Key 无效，请前往 https://open.bochaai.com/api-keys 重新创建密钥'
      : lastError,
  )
}
