import type { Connect, Plugin } from 'vite'
import type { Category, SearchResult } from '../src/types'
import { bochaWebSearch } from './bocha'
import { dashscopeWebSearch, isDashScopeKey } from './dashscope'
import { tencentWebSearch } from './tencent-wsa'

type SearchProvider = 'dashscope' | 'tencent' | 'bocha' | 'auto'

function isAuthError(message: string): boolean {
  return (
    message.includes('UnauthorizedOperation') ||
    message.includes('鉴权') ||
    message.includes('Invalid API KEY') ||
    message.includes('API Key 无效') ||
    message.includes('InvalidApiKey') ||
    message.includes('invalid_api_key')
  )
}

async function runSearch(
  apiKey: string,
  provider: SearchProvider,
  apiBase: string,
  query: string,
  category: Category,
) {
  if (provider === 'dashscope') {
    return dashscopeWebSearch(apiKey, query, category)
  }
  if (provider === 'tencent') {
    return tencentWebSearch(apiKey, query, category)
  }
  if (provider === 'bocha') {
    return bochaWebSearch(apiKey, query, category, apiBase.trim() || undefined)
  }

  const providers: Array<() => Promise<SearchResult>> = [
    () => bochaWebSearch(apiKey, query, category, apiBase.trim() || undefined),
  ]

  if (isDashScopeKey(apiKey)) {
    providers.push(() => dashscopeWebSearch(apiKey, query, category))
  }

  providers.push(() => tencentWebSearch(apiKey, query, category))

  let lastError = '搜索服务异常'

  for (const search of providers) {
    try {
      return await search()
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError
      if (!isAuthError(lastError)) throw err
    }
  }

  throw new Error(lastError)
}

function createSearchHandler(apiKey: string, provider: SearchProvider, apiBase: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/search')) {
      next()
      return
    }

    try {
      const url = new URL(req.url, 'http://localhost')
      const query = url.searchParams.get('q') ?? ''
      const category = (url.searchParams.get('cat') ?? 'all') as Category

      if (!apiKey) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: '未配置 SEARCH_API_KEY，请在 .env 文件中设置' }))
        return
      }

      const result = await runSearch(apiKey.trim(), provider, apiBase, query, category)

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    } catch (err) {
      const message = err instanceof Error ? err.message : '搜索服务异常'
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: message }))
    }
  }
}

export function searchApiPlugin(apiKey: string, provider: SearchProvider, apiBase: string): Plugin {
  const handler = createSearchHandler(apiKey, provider, apiBase)

  return {
    name: 'search-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
