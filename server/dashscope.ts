import type { Category, SearchItem, SearchResult } from '../src/types'

const DASHSCOPE_API_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

interface DashScopeSearchResult {
  index?: number
  title?: string
  url?: string
  site_name?: string
  icon?: string
}

interface DashScopeResponse {
  code?: string
  message?: string
  output?: {
    search_info?: {
      search_results?: DashScopeSearchResult[]
    }
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
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

function filterByCategory(items: SearchItem[], category: Category): SearchItem[] {
  if (category === 'all') return items
  return items.filter((item) => item.category === category)
}

function mapSearchResult(result: DashScopeSearchResult, summary?: string): SearchItem | null {
  if (!result.title || !result.url) return null

  const category = inferCategory(result.url, result.site_name)
  return {
    id: result.url,
    title: result.title,
    description: summary || '',
    category,
    tags: result.site_name ? [result.site_name] : [],
    url: result.url,
    date: '',
    siteName: result.site_name,
    siteIcon: result.icon,
  }
}

export function isDashScopeKey(apiKey: string): boolean {
  return /^sk-[a-f0-9]{32}$/i.test(apiKey.trim())
}

export async function dashscopeWebSearch(
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

  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      input: {
        messages: [{ role: 'user', content: trimmed }],
      },
      parameters: {
        enable_search: true,
        search_options: {
          enable_source: true,
          search_strategy: 'agent',
        },
        result_format: 'message',
      },
    }),
  })

  const data = (await response.json()) as DashScopeResponse

  if (data.code || !response.ok) {
    const msg = data.message || `百炼 API 错误 (${response.status})`
    if (msg.includes('Invalid') || msg.includes('invalid') || msg.includes('ApiKey')) {
      throw new Error('API Key 无效，请检查阿里云百炼控制台中的密钥')
    }
    throw new Error(msg)
  }

  const searchResults = data.output?.search_info?.search_results ?? []
  const aiSummary = data.output?.choices?.[0]?.message?.content ?? ''

  const items = filterByCategory(
    searchResults
      .map((result, index) =>
        mapSearchResult(result, index === 0 && aiSummary ? aiSummary.slice(0, 200) : ''),
      )
      .filter((item): item is SearchItem => item !== null),
    category,
  )

  return {
    items,
    total: items.length,
    query: trimmed,
    took: Math.round(performance.now() - start),
  }
}
