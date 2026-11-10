import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Home,
  Package,
  ShoppingBag,
  Store,
} from 'lucide-react'

const tabs = [
  { label: 'Início', path: '/', icon: Home, end: true },
  { label: 'Estoque', path: '/products', icon: Package },
  { label: 'Compras', path: '/purchases', icon: ShoppingBag },
  { label: 'Vendas', path: '/sales', icon: Store },
  { label: 'Relatório', path: '/reports', icon: BarChart3 },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <div className="bottom-nav__inner">
        {tabs.map((tab) => {
          const Icon = tab.icon

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                isActive ? 'nav-link is-active' : 'nav-link'
              }
            >
              <Icon strokeWidth={2.1} aria-hidden />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
