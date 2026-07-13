'use strict'

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const API_BASES = ['https://api.bocha.cn', 'https://api.bochaai.com']

function jsonResponse(statusCode, body) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  }
}

function freshnessForCategory(category) {
  return category === 'news' ? 'oneMonth' : 'noLimit'
}

async function bochaSearch(apiKey, query, category) {
  const freshness = freshnessForCategory(category)
  let lastError = '搜索失败'

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}/v1/web-search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          summary: true,
          freshness,
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

exports.main_handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.httpMethod || 'GET'

  if (method === 'OPTIONS') {
    return {
      isBase64Encoded: false,
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  const path = event.path || event.requestContext?.path || '/'
  const isSearch =
    path === '/' || path === '/api/search' || path.endsWith('/api/search')

  if (!isSearch) {
    return jsonResponse(404, { error: 'Not Found' })
  }

  const apiKey = process.env.SEARCH_API_KEY
  if (!apiKey) {
    return jsonResponse(500, { error: '未配置 SEARCH_API_KEY 环境变量' })
  }

  const params = event.queryString || event.queryStringParameters || {}
  const query = params.q || ''
  const category = params.cat || 'all'

  try {
    const result = await bochaSearch(apiKey, query, category)
    return jsonResponse(200, result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '搜索失败'
    return jsonResponse(502, { error: message })
  }
}
