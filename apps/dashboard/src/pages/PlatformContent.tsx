import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const CATEGORIES = ['General', 'Orders', 'Products', 'Payments', 'Settings', 'Returns', 'Loyalty', 'Referrals']

interface Article {
  id: string
  title: string
  category: string
  content: string
  slug: string
  published?: boolean
}

interface ArticleEditorProps {
  article: Partial<Article> | null
  onClose: () => void
  onSave: (data: Partial<Article>) => void
  isPending: boolean
}

function ArticleEditor({ article, onClose, onSave, isPending }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [category, setCategory] = useState(article?.category ?? 'General')
  const [content, setContent] = useState(article?.content ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const autoSlug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '')

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (!article?.id) setSlug(autoSlug(v))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">{article?.id ? 'Редактировать статью' : 'Новая статья'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Заголовок</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Заголовок статьи"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Slug (URL)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="article-slug"
              className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium text-gray-500">Содержание</label>
              <div className="ml-auto flex bg-gray-100 rounded-lg overflow-hidden">
                {(['edit', 'preview'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  >
                    {t === 'edit' ? 'Редактор' : 'Предпросмотр'}
                  </button>
                ))}
              </div>
            </div>
            {tab === 'edit' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Markdown содержание статьи..."
                rows={14}
                className="w-full border rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            ) : (
              <div className="border rounded-xl px-4 py-3 min-h-[14rem] text-sm prose max-w-none whitespace-pre-wrap bg-gray-50">
                {content || <span className="text-gray-400 italic">Нет содержания для предпросмотра</span>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-50 transition-colors">Отмена</button>
          <button
            onClick={() => onSave({ title, category, content, slug, published: true })}
            disabled={!title.trim() || !content.trim() || isPending}
            className="px-5 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 font-medium disabled:opacity-50 transition-colors"
          >
            Сохранить черновик
          </button>
          <button
            onClick={() => onSave({ title, category, content, slug, published: true })}
            disabled={!title.trim() || !content.trim() || isPending}
            className="px-5 py-2 text-sm rounded-xl bg-accent text-white hover:bg-accent/90 font-medium disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlatformContentPage() {
  const qc = useQueryClient()
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['platform-help-articles'],
    queryFn: api.platform.helpArticles,
  })

  const createMutation = useMutation({
    mutationFn: (body: Partial<Article>) =>
      editingArticle?.id
        ? api.platform.updateHelpArticle(editingArticle.id, body)
        : api.platform.createHelpArticle(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-help-articles'] })
      setShowEditor(false)
      setEditingArticle(null)
    },
  })

  const filtered = (articles as Article[]).filter((a) => {
    if (filterCategory && a.category !== filterCategory) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filtered.reduce<Record<string, Article[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold font-display">База знаний</h1>
        <button
          onClick={() => { setEditingArticle(null); setShowEditor(true) }}
          className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          + Новая статья
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white rounded-xl border">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Поиск по заголовку..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none">
          <option value="">Все категории</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} статей</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-12">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm">Статей нет</p>
          <button
            onClick={() => { setEditingArticle(null); setShowEditor(true) }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            Создать первую статью
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, arts]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h2>
              <div className="bg-white rounded-2xl border overflow-hidden">
                {arts.map((a, i) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${i !== arts.length - 1 ? 'border-b' : ''}`}
                    onClick={() => { setEditingArticle(a); setShowEditor(true) }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">/help/{a.slug}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${'published' in a && !a.published ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {'published' in a && !a.published ? 'Черновик' : 'Опубликована'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingArticle(a); setShowEditor(true) }}
                        className="text-xs text-accent hover:underline px-2 py-1"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <ArticleEditor
          article={editingArticle}
          onClose={() => { setShowEditor(false); setEditingArticle(null) }}
          onSave={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  )
}
