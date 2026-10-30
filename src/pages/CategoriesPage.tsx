// Kategori: every category as a picture tile (the phone bottom menu's "Kategori" opens this)
import { Link } from 'react-router-dom'
import { useCatalog } from '../lib/catalog'

export default function CategoriesPage() {
  const { catalog, error } = useCatalog()

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <h1 className="mb-4 text-xl font-bold md:text-2xl">Kategori</h1>
      {error && <p className="text-gray-600">Kategori gagal dimuat. Periksa internet lalu muat ulang halaman.</p>}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {(catalog?.categories ?? []).map((c) => (
          <li key={c.slug}>
            <Link to={`/kategori/${c.slug}`} className="group flex h-full flex-col items-center gap-2 rounded-xl bg-white p-2.5 text-center ring-1 ring-gray-100 transition hover:ring-2 hover:ring-brand-yellow">
              <span className="aspect-square w-full overflow-hidden rounded-lg bg-brand-yellow/15">
                {c.image && <img src={c.image} alt="" loading="lazy" width="240" height="240" className="size-full object-cover" />}
              </span>
              <span className="text-xs font-semibold leading-tight group-hover:text-brand-pink md:text-sm">{c.name}</span>
              <span className="text-[11px] text-gray-400">{c.count} produk</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
