// Admin: all products (also hidden ones) with search and filters. Click a product to edit it.
// Tick products (or "Pilih semua" = everything the filters show, e.g. one category) to change stock or delete them at once.
// The first time, offers to import the catalog files (public/data) into the database.
import { DatabaseZap, EyeOff, ImageOff, Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { findProducts, loadFullCatalog } from '../lib/catalog'
import { deleteMany, importFromFiles, setStockMany } from '../lib/catalogAdmin'
import { formatRupiah } from '../lib/shop'
import type { Catalog } from '../types/product'
import { INPUT } from './styles'

type Filter = 'semua' | 'habis' | 'sembunyi'
const PAGE = 50

export default function AdminProducts() {
  const [catalog, setCatalog] = useState<(Catalog & { source: string }) | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')
  const [shown, setShown] = useState(PAGE)
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState('')

  const load = () => loadFullCatalog().then(setCatalog, (e: Error) => setError(e.message))
  useEffect(() => {
    load()
  }, [])
  function reload() {
    setCatalog(null)
    load()
  }

  if (error) return <p className="text-red-700">Gagal memuat: {error}</p>
  if (!catalog) return <Loader2 className="mx-auto size-8 animate-spin text-brand-pink" />
  if (catalog.source === 'files') return <ImportPanel onDone={reload} />

  const results = findProducts(catalog.products, { query, category: category || undefined, sort: 'terbaru' }).filter((p) =>
    filter === 'habis' ? !p.inStock : filter === 'sembunyi' ? p.hidden : true,
  )
  const allShownSelected = results.length > 0 && results.every((p) => selected.has(p.id))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  function toggleAll() {
    setSelected(allShownSelected ? new Set() : new Set(results.map((p) => p.id)))
  }

  async function run(label: string, action: (ids: string[], onProgress: (d: number, t: number) => void) => Promise<void>) {
    const ids = [...selected]
    setBusy(`${label}…`)
    try {
      await action(ids, (d, t) => setBusy(`${label} ${d} / ${t}…`))
      setSelected(new Set())
      setBusy('')
      reload()
    } catch (e) {
      setBusy('')
      setError((e as Error).message)
    }
  }
  function bulkStock(inStock: boolean) {
    run(inStock ? 'Mengubah ke Tersedia' : 'Mengubah ke Habis', (ids, onProgress) => setStockMany(ids, inStock, onProgress))
  }
  function bulkDelete() {
    if (!window.confirm(`Hapus ${selected.size} produk selamanya? Tidak bisa dikembalikan.`)) return
    run('Menghapus', deleteMany)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Produk</h1>
          <p className="text-sm text-gray-500">{catalog.products.length} produk · {catalog.products.filter((p) => p.hidden).length} disembunyikan</p>
        </div>
        <Link to="/admin/produk/baru" className="ml-auto rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white">+ Tambah produk</Link>
        <Link to="/admin/update-harga" className="rounded-full bg-brand-yellow px-4 py-2 text-sm font-semibold text-ink">Update Harga & Foto</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} placeholder="Cari nama atau kode…" className={`${INPUT} pl-9`} />
        </label>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE) }} className={`${INPUT} w-auto`} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {catalog.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {(['semua', 'habis', 'sembunyi'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setShown(PAGE) }}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === f ? 'bg-brand-pink text-white' : 'bg-white ring-1 ring-gray-200'}`}
          >
            {f === 'sembunyi' ? 'Disembunyikan' : f}
          </button>
        ))}
      </div>

      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
        <label className="flex cursor-pointer items-center gap-2 px-1 text-sm font-semibold">
          <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="size-4 accent-brand-pink" />
          Pilih semua ({results.length})
        </label>
        {busy ? (
          <span className="ml-auto flex items-center gap-2 text-sm font-semibold text-brand-pink"><Loader2 className="size-4 animate-spin" /> {busy}</span>
        ) : selected.size > 0 ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">{selected.size} dipilih:</span>
            <button onClick={() => bulkStock(true)} className="rounded-full bg-green-600 px-3 py-1.5 text-sm font-semibold text-white">Stok Tersedia</button>
            <button onClick={() => bulkStock(false)} className="rounded-full bg-gray-700 px-3 py-1.5 text-sm font-semibold text-white">Stok Habis</button>
            <button onClick={bulkDelete} className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">Hapus</button>
          </span>
        ) : (
          <span className="ml-auto text-xs text-gray-500">Centang produk untuk ubah stok atau hapus sekaligus</span>
        )}
      </div>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
        {results.slice(0, shown).map((p) => (
          <li key={p.id} className="flex items-center gap-1 pl-3">
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Pilih ${p.name}`} className="size-4 shrink-0 accent-brand-pink" />
            <Link to={`/admin/produk/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3 hover:bg-brand-yellow/10">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100">
                {p.image ? <img src={p.image} alt="" loading="lazy" className="size-full object-cover" /> : <ImageOff className="size-5 text-gray-400" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
                <span className="flex flex-wrap gap-x-2 text-xs text-gray-500">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  {p.hasVariants && <span>ada variasi</span>}
                  {!p.inStock && <span className="font-semibold text-red-600">Habis</span>}
                  {p.hidden && <span className="flex items-center gap-0.5 font-semibold text-gray-600"><EyeOff className="size-3" /> Disembunyikan</span>}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-brand-pink">{p.fromPrice && 'mulai '}{formatRupiah(p.price)}</span>
            </Link>
          </li>
        ))}
        {results.length === 0 && <li className="p-6 text-center text-sm text-gray-500">Tidak ada produk.</li>}
      </ul>
      {shown < results.length && (
        <button onClick={() => setShown(shown + PAGE)} className="mx-auto block rounded-full px-5 py-2 text-sm font-semibold text-brand-pink ring-1 ring-brand-pink">
          Tampilkan lebih banyak ({results.length - shown} lagi)
        </button>
      )}
    </div>
  )
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')

  async function start() {
    setError('')
    setProgress({ done: 0, total: 1 })
    try {
      await importFromFiles((done, total) => setProgress({ done, total }))
      onDone()
    } catch (e) {
      setError((e as Error).message)
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6 text-center ring-1 ring-gray-100">
      <DatabaseZap className="mx-auto size-10 text-brand-pink" />
      <h1 className="text-lg font-bold">Database masih kosong</h1>
      <p className="text-sm text-gray-600">
        Sekarang website memakai data dari file katalog (public/data). Impor sekali ke database supaya harga dan produk bisa diubah dari halaman admin.
      </p>
      {progress ? (
        <div className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-brand-pink transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="text-sm text-gray-600">Mengimpor… {progress.done} / {progress.total} produk. Jangan tutup halaman ini.</p>
        </div>
      ) : (
        <button onClick={start} className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">Impor data sekarang</button>
      )}
      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">Gagal: {error}</p>}
    </div>
  )
}
