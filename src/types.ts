export type Category = 'all' | 'article' | 'video' | 'tool' | 'news'

export interface SearchItem {
  id: string
  title: string
  description: string
  category: Exclude<Category, 'all'>
  tags: string[]
  url: string
  date: string
  siteName?: string
  siteIcon?: string
}

export interface SearchResult {
  items: SearchItem[]
  total: number
  query: string
  took: number
}
