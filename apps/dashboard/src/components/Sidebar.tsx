import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Обзор', icon: '📊' },
  { to: '/products', label: 'Товары', icon: '📦' },
  { to: '/orders', label: 'Заказы', icon: '🛒' },
]

const platformLinks = [
  { to: '/platform', label: 'Обзор', icon: '🌐' },
  { to: '/platform/tenants', label: 'Магазины', icon: '🏪' },
  { to: '/platform/subscriptions', label: 'Подписки', icon: '💳' },
  { to: '/platform/analytics', label: 'Аналитика', icon: '📊' },
  { to: '/platform/team', label: 'Команда', icon: '👥' },
  { to: '/platform/audit', label: 'Журнал', icon: '📋' },
  { to: '/platform/status', label: 'Статус', icon: '🟢' },
  { to: '/platform/support', label: 'Поддержка', icon: '💬' },
  { to: '/platform/content', label: 'Контент', icon: '📚' },
]

interface SidebarProps {
  onSearchOpen: () => void
  onAIToggle: () => void
  aiOpen: boolean
}

export function Sidebar({ onSearchOpen, onAIToggle, aiOpen }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-screen p-4 flex flex-col gap-1 flex-shrink-0">
      <div className="px-3 py-4 mb-1">
        <span className="font-display font-bold text-lg">
          dok<span className="text-accent">only</span>
        </span>
      </div>

      {/* Search button */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors mb-2 w-full text-left"
      >
        <span>🔍</span>
        <span className="flex-1">Поиск</span>
        <kbd className="text-xs bg-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <span>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}

      <div className="mt-4 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Platform Ops
      </div>
      {platformLinks.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/platform'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-gray-600 hover:bg-gray-50'
            }`
          }
        >
          <span>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}

      {/* AI Helper toggle */}
      <div className="mt-auto pt-4">
        <button
          onClick={onAIToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            aiOpen ? 'bg-accent text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>🤖</span>
          <span className="flex-1 text-left">ИИ-помощник</span>
          {!aiOpen && <span className="text-xs text-gray-400">Business+</span>}
        </button>
        <p className="text-center text-xs text-gray-300 mt-2">
          <kbd className="bg-gray-100 px-1 rounded font-mono">?</kbd> — горячие клавиши
        </p>
      </div>
    </aside>
  )
}
