// Phone-only menu fixed at the bottom of the screen (like the Shopee app). Hidden on tablet/desktop.
import { Home, LayoutGrid, ShoppingCart } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useCart } from '../lib/cart'

export default function BottomNav() {
  const { count } = useCart()
  const items = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/kategori', label: 'Kategori', icon: LayoutGrid },
    { to: '/keranjang', label: 'Keranjang', icon: ShoppingCart, badge: count },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Menu bawah">
      <ul className="grid grid-cols-3">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-pink' : 'text-gray-500'}`
              }
            >
              <Icon className="size-5" />
              {label}
              {!!badge && (
                <span className="absolute left-1/2 top-1 ml-1.5 grid min-w-4 place-items-center rounded-full bg-brand-pink px-1 text-[10px] font-bold leading-4 text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
