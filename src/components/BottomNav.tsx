
import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'Início', path: '/', icon: '⌂', end: true },
  { label: 'Estoque', path: '/products', icon: '▦' },
  { label: 'Compras', path: '/purchases', icon: '🛒' },
  { label: 'Vendas', path: '/sales', icon: '⇧' },
  { label: 'Relatórios', path: '/reports', icon: '▥' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-800 bg-gray-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition ${
                isActive
                  ? 'text-green-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-2xl leading-none ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                <span className="text-[10px] font-medium sm:text-xs">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="mt-0.5 h-1 w-4 rounded-full bg-green-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
