import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Обзор', icon: '📊' },
  { to: '/products', label: 'Товары', icon: '📦' },
  { to: '/orders', label: 'Заказы', icon: '🛒' },
]

const platformLinks = [
  { to: '/platform', label: 'Platform', icon: '🌐' },
  { to: '/platform/tenants', label: 'Магазины', icon: '🏪' },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-screen p-4 flex flex-col gap-1">
      <div className="px-3 py-4 mb-2">
        <span className="font-display font-bold text-lg">
          dok<span className="text-accent">only</span>
        </span>
      </div>
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
    </aside>
  )
}
