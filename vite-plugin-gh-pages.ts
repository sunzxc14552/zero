import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

function getPathSegmentsToKeep(base: string): number {
  const trimmed = base.replace(/^\/|\/$/g, '')
  if (!trimmed) return 0
  return trimmed.split('/').filter(Boolean).length
}

const SPA_BOOTSTRAP = `
<script type="text/javascript">
  (function(l) {
    if (l.search[1] === '/') {
      var decoded = l.search.slice(1).split('&').map(function(s) {
        return s.replace(/~and~/g, '&')
      }).join('?');
      window.history.replaceState(null, null,
        l.pathname.slice(0, -1) + decoded + l.hash
      );
    }
  }(window.location))
</script>`

function create404Html(pathSegmentsToKeep: number): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>智搜</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = ${pathSegmentsToKeep};
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>`
}

export function ghPagesPlugin(base = '/'): Plugin {
  const pathSegmentsToKeep = getPathSegmentsToKeep(base)

  return {
    name: 'gh-pages',
    closeBundle() {
      const distDir = resolve('dist')
      const index = resolve(distDir, 'index.html')
      const fallback = resolve(distDir, '404.html')
      const nojekyll = resolve(distDir, '.nojekyll')

      mkdirSync(distDir, { recursive: true })

      if (existsSync(index)) {
        let html = readFileSync(index, 'utf-8')
        if (!html.includes('pathSegmentsToKeep') && !html.includes('l.search[1]')) {
          html = html.replace('</head>', `${SPA_BOOTSTRAP}\n  </head>`)
          writeFileSync(index, html)
        }
        copyFileSync(index, fallback)
      }

      if (pathSegmentsToKeep > 0) {
        writeFileSync(fallback, create404Html(pathSegmentsToKeep))
      }

      writeFileSync(nojekyll, '')
    },
  }
}
