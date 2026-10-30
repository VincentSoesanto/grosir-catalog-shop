import { Link } from 'react-router-dom'
import { SHOP } from '../lib/shop'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="mt-12 border-t-4 border-brand-yellow bg-brand-pink-dark text-pink-100">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 lg:grid-cols-3">
        <div className="col-span-2 space-y-3 lg:col-span-1">
          <img src="/img/logo.svg" alt={SHOP.name} width="320" height="165" loading="lazy" className="h-12 w-auto" />
          <p className="text-sm">Grosir perlengkapan pesta, alat tulis & fancy.</p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-brand-yellow">Belanja</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/produk" className="hover:text-brand-yellow">Semua Produk</Link></li>
            <li><Link to="/kategori" className="hover:text-brand-yellow">Kategori</Link></li>
            <li><Link to="/keranjang" className="hover:text-brand-yellow">Keranjang</Link></li>
          </ul>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <h3 className="mb-3 font-semibold text-brand-yellow">Kontak</h3>
          <ul className="space-y-2 text-sm">
            <li>{SHOP.address}</li>
            <li>WA: <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-brand-yellow">{SHOP.whatsappDisplay}</a></li>
            <li>IG: <a href={`https://instagram.com/${SHOP.instagram}`} target="_blank" rel="noreferrer" className="hover:text-brand-yellow">@{SHOP.instagram}</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/15 py-4 text-center text-xs text-pink-200">© {YEAR} {SHOP.name}</p>
    </footer>
  )
}
