import type { Category } from '../types'

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'all', label: '全部', icon: '⊞' },
  { value: 'article', label: '文章', icon: '📄' },
  { value: 'video', label: '视频', icon: '🎬' },
  { value: 'tool', label: '工具', icon: '🔧' },
  { value: 'news', label: '资讯', icon: '📰' },
]

interface CategoryFilterProps {
  active: Category
  onChange: (category: Category) => void
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          className={`category-btn ${active === cat.value ? 'active' : ''}`}
          onClick={() => onChange(cat.value)}
        >
          <span className="category-icon">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  )
}
