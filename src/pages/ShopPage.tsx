// Toko: all products, or one category (/kategori/balon). Search (?q=) and sort (?urut=) live in the address,
// so a search result can be shared or bookmarked, and the back button works.
import { ChevronDown, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProductGrid, { ProductGridSkeleton } from '../components/ProductGrid'
import { findProducts, SORT_OPTIONS, useCatalog, type SortKey } from '../lib/catalog'
import type { Category } from '../types/product'

const PAGE_SIZE = 30

export default function ShopPage() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const sort = (params.get('urut') as SortKey) || 'terbaru'
  const { catalog, error } = useCatalog()

  // How many products are shown; "Muat lebih banyak" adds a page. Starts over when the filter changes.
  const filterKey = `${slug}|${query}|${sort}`
  const [shown, setShown] = useState({ key: filterKey, count: PAGE_SIZE })
  const visibleCount = shown.key === filterKey ? shown.count : PAGE_SIZE

  const category = catalog?.categories.find((c) => c.slug === slug)
  const results = catalog ? findProducts(catalog.products, { category: slug, query, sort }) : []
  const title = query ? `Hasil pencarian “${query}”` : (category?.name ?? 'Semua Produk')

  function setSort(value: SortKey) {
    const next = new URLSearchParams(params)
    if (value === 'terbaru') next.delete('urut')
    else next.set('urut', value)
    setParams(next, { replace: true })
  }

  if (error) {
    return <p className="px-4 py-20 text-center text-gray-600">Produk gagal dimuat. Periksa internet lalu muat ulang halaman.</p>
  }
  if (catalog && slug && !category) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="mb-4 text-gray-600">Kategori tidak ditemukan.</p>
        <Link to="/produk" className="font-semibold text-brand-pink hover:underline">Lihat semua produk</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      {/* Breadcrumb */}
      <nav className="mb-2 text-xs text-gray-500" aria-label="Lokasi halaman">
        <Link to="/" className="hover:text-brand-pink">Beranda</Link>
        <span className="mx-1.5">/</span>
        {category ? (
          <>
            <Link to="/produk" className="hover:text-brand-pink">Produk</Link>
            <span className="mx-1.5">/</span>
            <span className="text-gray-700">{category.name}</span>
          </>
        ) : (
          <span className="text-gray-700">Produk</span>
        )}
      </nav>

      <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8">
        {catalog && <CategorySidebar categories={catalog.categories} active={slug} query={query} />}

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-4">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
              {catalog && <p className="text-sm text-gray-500">{results.length.toLocaleString('id-ID')} produk</p>}
            </div>
            <label className="relative">
              <span className="sr-only">Urutkan</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="appearance-none rounded-full border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm font-medium outline-none focus:border-brand-pink"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            </label>
          </div>

          {!catalog ? (
            <ProductGridSkeleton wide={false} />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-16 text-center ring-1 ring-gray-100">
              <SearchX className="size-10 text-brand-pink" />
              <p className="font-semibold">Produk tidak ditemukan</p>
              <p className="text-sm text-gray-500">Coba kata lain, atau tanya kami lewat WhatsApp.</p>
              <Link to="/produk" className="mt-2 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white">Lihat semua produk</Link>
            </div>
          ) : (
            <>
              <ProductGrid products={results.slice(0, visibleCount)} wide={false} />
              {visibleCount < results.length && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-500">Menampilkan {visibleCount} dari {results.length}</p>
                  <button
                    onClick={() => setShown({ key: filterKey, count: visibleCount + PAGE_SIZE })}
                    className="rounded-full border-2 border-brand-pink px-6 py-2 font-semibold text-brand-pink transition hover:bg-brand-pink hover:text-white"
                  >
                    Muat lebih banyak
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/** Categories: a sideways-scrolling row of chips on phones, a list on the left on desktop */
function CategorySidebar({ categories, active, query }: { categories: Category[]; active?: string; query: string }) {
  const keepSearch = query ? `?q=${encodeURIComponent(query)}` : ''
  const items = [{ slug: undefined, name: 'Semua', count: undefined }, ...categories]

  return (
    <aside className="mb-4 lg:mb-0">
      <h2 className="mb-2 hidden text-sm font-bold uppercase tracking-wide text-gray-500 lg:block">Kategori</h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {items.map((c) => {
          const isActive = c.slug === active
          return (
            <li key={c.slug ?? 'semua'} className="shrink-0">
              <Link
                to={(c.slug ? `/kategori/${c.slug}` : '/produk') + keepSearch}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between gap-2 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition lg:rounded-lg lg:py-2 ${
                  isActive
                    ? 'bg-brand-pink font-semibold text-white'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-brand-yellow/30 lg:bg-transparent lg:ring-0'
                }`}
              >
                {c.name}
                {c.count !== undefined && <span className={`hidden text-xs lg:inline ${isActive ? 'text-white/80' : 'text-gray-400'}`}>{c.count}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
