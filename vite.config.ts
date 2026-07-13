import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { searchApiPlugin } from './server/search-api-plugin'
import { ghPagesPlugin } from './vite-plugin-gh-pages'

type SearchProvider = 'dashscope' | 'tencent' | 'bocha' | 'auto'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const provider = (env.SEARCH_PROVIDER ?? 'auto') as SearchProvider
  const apiKey = env.SEARCH_API_KEY?.trim() || env.BOCHA_API_KEY?.trim() || ''
  const base =
    command === 'build'
      ? (process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || './')
      : (process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/')

  return {
    base,
    plugins: [
      react(),
      ...(command === 'serve'
        ? [
            searchApiPlugin(
              apiKey,
              provider,
              env.BOCHA_API_BASE?.trim() ?? 'https://api.bocha.cn',
            ),
          ]
        : []),
      ghPagesPlugin(base),
    ],
  }
})
