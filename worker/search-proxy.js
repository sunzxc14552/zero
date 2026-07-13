export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    if (!url.pathname.endsWith('/api/search')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders })
    }

    const apiKey = env.SEARCH_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'Worker 未配置 SEARCH_API_KEY' }, { status: 500, headers: corsHeaders })
    }

    const query = url.searchParams.get('q') ?? ''
    const category = url.searchParams.get('cat') ?? 'all'
    const freshness = category === 'news' ? 'oneMonth' : 'noLimit'

    const bases = ['https://api.bocha.cn', 'https://api.bochaai.com']
    let lastError = '搜索失败'

    for (const base of bases) {
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

        return Response.json(
          {
            items,
            total: webPages?.totalEstimatedMatches ?? items.length,
            query,
            took: 0,
          },
          { headers: corsHeaders },
        )
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError
      }
    }

    return Response.json({ error: lastError }, { status: 502, headers: corsHeaders })
  },
}
