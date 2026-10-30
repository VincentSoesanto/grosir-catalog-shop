// Top of every page: thin info bar (desktop), then logo + search + cart, then the menu (desktop).
// The header sticks to the top while scrolling, like Shopee.
import { Clock, Search, ShoppingCart, Truck } from 'lucide-react'
import { type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { SHOP } from '../lib/shop'
import { useStoreSettings } from '../lib/storeSettings'
import { InstagramIcon, WhatsAppIcon } from './BrandIcons'

const MENU = [
  { to: '/', label: 'Beranda' },
  { to: '/produk', label: 'Semua Produk' },
  { to: '/kategori', label: 'Kategori' },
  { to: '/tentang', label: 'Tentang Kami' },
]

export default function Header() {
  const { count } = useCart()
  const { infoBar } = useStoreSettings()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const currentQuery = params.get('q') ?? ''

  // Search inside the open category if there is one, otherwise in all products
  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    const base = pathname.startsWith('/kategori/') ? pathname : '/produk'
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base)
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-yellow shadow-sm">
      {/* Info bar: desktop only, to keep the phone header short */}
      <div className="hidden bg-brand-pink-dark text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            {infoBar && <><Truck className="size-4" /> {infoBar}</>}
          </span>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {SHOP.hours}
            </span>
            <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
              <WhatsAppIcon className="size-3.5" /> {SHOP.whatsappDisplay}
            </a>
            <a href={`https://instagram.com/${SHOP.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
              <InstagramIcon className="size-3.5" /> @{SHOP.instagram}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-6 md:py-3">
        <Link to="/" className="shrink-0" aria-label={`${SHOP.name}, ke beranda`}>
          <img src="/img/logo.svg" alt={SHOP.name} width="320" height="165" className="h-9 w-auto md:h-12" />
        </Link>

        <form onSubmit={onSearch} role="search" className="relative flex-1">
          <label htmlFor="search" className="sr-only">Cari produk</label>
          <input
            id="search"
            name="q"
            key={currentQuery}
            defaultValue={currentQuery}
            type="search"
            placeholder="Cari balon, alat tulis, kertas kado…"
            className="w-full rounded-full border-2 border-transparent bg-white py-2 pl-4 pr-11 text-sm shadow-sm outline-none transition focus:border-brand-pink"
          />
          <button type="submit" aria-label="Cari" className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-brand-pink text-white">
            <Search className="size-4" />
          </button>
        </form>

        <Link to="/keranjang" className="relative grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-white/50" aria-label={`Keranjang, ${count} barang`}>
          <ShoppingCart className="size-6" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-pink ring-2 ring-brand-yellow px-1 text-[11px] font-bold leading-5 text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Link>
      </div>

      <nav className="hidden bg-brand-pink md:block" aria-label="Menu utama">
        <ul className="mx-auto flex max-w-7xl gap-1 px-4">
          {MENU.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end
                className={({ isActive }) =>
                  `block border-b-[3px] px-3 py-2 text-sm font-semibold text-white transition ${
                    isActive ? 'border-brand-yellow' : 'border-transparent hover:border-white/60'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
