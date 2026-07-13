import http from 'node:http'

const PORT = Number(process.env.PORT || 8787)
const API_KEY = process.env.SEARCH_API_KEY || ''
const API_BASES = ['https://api.bocha.cn', 'https://api.bochaai.com']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function freshnessForCategory(category) {
  return category === 'news' ? 'oneMonth' : 'noLimit'
}

async function bochaSearch(query, category) {
  let lastError = '搜索失败'

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/v1/web-search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          summary: true,
          freshness: freshnessForCategory(category),
          count: 20,
        }),
      })

      const data = await res.json()

      if (data.type === 'error' || data.code === 401 || data.code === '401') {
        lastError = data.message || 'API Key 无效'
        continue
      }

      if (!res.ok) {
        lastError = data.message || `API 错误 ${res.status}`
        continue
      }

      const webPages = data.data?.webPages ?? data.webPages
      const pages = webPages?.value ?? []

      const items = pages.map((page) => ({
        id: page.id || page.url,
        title: page.name,
        description: page.summary || page.snippet || '',
        category: 'article',
        tags: page.siteName ? [page.siteName] : [],
        url: page.url,
        date: page.datePublished ? page.datePublished.slice(0, 10) : '',
        siteName: page.siteName,
        siteIcon: page.siteIcon,
      }))

      return {
        items,
        total: webPages?.totalEstimatedMatches ?? items.length,
        query,
        took: 0,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError
    }
  }

  throw new Error(lastError)
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { ...CORS_HEADERS, 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname !== '/api/search' || req.method !== 'GET') {
    sendJson(res, 404, { error: 'Not Found' })
    return
  }

  if (!API_KEY) {
    sendJson(res, 500, { error: '未配置 SEARCH_API_KEY 环境变量' })
    return
  }

  const query = url.searchParams.get('q') || ''
  const category = url.searchParams.get('cat') || 'all'

  try {
    const result = await bochaSearch(query, category)
    sendJson(res, 200, result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败'
    sendJson(res, 502, { error: message })
  }
})

server.listen(PORT, () => {
  console.log(`搜索代理已启动: http://0.0.0.0:${PORT}/api/search`)
})
