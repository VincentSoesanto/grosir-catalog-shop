// Admin: prepared updates (public/data/updates): price/name updates and variant photo fixes.
// Shows every change (old -> new) before anything is saved; "Terapkan" saves them all at once.
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { loadFullCatalog } from '../lib/catalog'
import { applyCatalogUpdate, applyPriceUpdate, applyShowUpdate, applyVariantPhotoFix, type CatalogUpdate, type PriceUpdate, type ShowUpdate, type VariantPhotoFix } from '../lib/catalogAdmin'
import { formatRupiah } from '../lib/shop'
import type { ProductSummary } from '../types/product'

type AnyUpdate = PriceUpdate | VariantPhotoFix | CatalogUpdate | ShowUpdate
const isShow = (u: AnyUpdate): u is ShowUpdate => 'kind' in u && u.kind === 'show'
const isPhotoFix = (u: AnyUpdate): u is VariantPhotoFix => 'kind' in u && u.kind === 'variantPhotos'
const isCatalog = (u: AnyUpdate): u is CatalogUpdate => 'kind' in u && u.kind === 'catalog'

async function fetchAll() {
  const list = (await (await fetch('/data/updates/index.json')).json()) as { id: string }[]
  const updates = await Promise.all(list.map(async (u) => (await (await fetch(`/data/updates/${u.id}.json`)).json()) as AnyUpdate))
  return { updates, catalog: await loadFullCatalog() }
}

export default function AdminUpdates() {
  const [updates, setUpdates] = useState<AnyUpdate[] | null>(null)
  const [products, setProducts] = useState<Map<string, ProductSummary>>(new Map())
  const [applied, setApplied] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  function show(data: Awaited<ReturnType<typeof fetchAll>>) {
    setProducts(new Map(data.catalog.products.map((p) => [p.id, p])))
    setApplied(data.catalog.appliedUpdates)
    setUpdates(data.updates)
  }
  const load = () => fetchAll().then(show)
  useEffect(() => {
    fetchAll().then(show, (e: Error) => setError(e.message))
  }, [])

  async function apply(update: AnyUpdate) {
    const count = isCatalog(update) ? update.matched.length + update.new.length : update.changes.length
    if (!window.confirm(`Terapkan "${update.title}"? ${count} produk akan diubah/ditambah.`)) return
    setBusy(update.id)
    setError('')
    try {
      const onProgress = (done: number, total: number) => setProgress(`${done} / ${total}`)
      if (isShow(update)) await applyShowUpdate(update, onProgress)
      else if (isCatalog(update)) await applyCatalogUpdate(update, onProgress)
      else if (isPhotoFix(update)) await applyVariantPhotoFix(update, onProgress)
      else await applyPriceUpdate(update, onProgress)
      await load()
    } catch (e) {
      setError(`Gagal: ${(e as Error).message}`)
    } finally {
      setBusy(null)
      setProgress('')
    }
  }

  if (error && !updates) return <p className="text-red-700">Gagal memuat: {error}</p>
  if (!updates) return <Loader2 className="mx-auto size-8 animate-spin text-brand-pink" />

  return (
    <div className="space-y-6">
      <Link to="/admin" className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand-pink">
        <ArrowLeft className="size-4" /> Semua produk
      </Link>
      <h1 className="text-xl font-bold">Update Harga & Foto</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{error}</p>}

      {updates.map((u) => {
        const done = applied.includes(u.id)
        const button = done ? (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700"><Check className="size-4" /> Sudah diterapkan</span>
        ) : (
          <button onClick={() => apply(u)} disabled={busy !== null} className="flex items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {busy === u.id && <Loader2 className="size-4 animate-spin" />} {busy === u.id && progress ? `Menyimpan ${progress}…` : 'Terapkan'}
          </button>
        )
        if (isPhotoFix(u)) return <PhotoFixSection key={u.id} fix={u} button={button} />
        if (isShow(u))
          return (
            <section key={u.id} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{u.title}</h2>
                  <p className="text-sm text-gray-500">{u.changes.length} produk tampil lagi, hanya dengan foto baru</p>
                </div>
                {button}
              </div>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {u.changes.map((c) => (
                  <li key={c.productId} className="text-[11px]">
                    <img src={c.image} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" />
                    <p className="mt-1 line-clamp-2">{c.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          )
        if (isCatalog(u)) return <CatalogSection key={u.id} update={u} hideCount={done ? null : products.size - u.matched.length} button={button} />
        const changed = u.changes.filter((c) => {
          const old = products.get(c.productId)
          return c.isNew || !old || (c.price !== undefined && old.price !== c.price) || old.name !== c.name || old.sku !== c.kode
        })
        return (
          <section key={u.id} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{u.title}</h2>
                <p className="text-sm text-gray-500">
                  {u.changes.length} produk
                  {u.changes.some((c) => c.isNew) && ` · ${u.changes.filter((c) => c.isNew).length} baru (kategori ${u.newCategory.name})`}
                </p>
              </div>
              {button}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2 pr-3">Kode</th>
                    <th className="py-2 pr-3">Nama</th>
                    <th className="py-2 pr-3 text-right">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {(done ? u.changes : changed).map((c) => {
                    const old = c.isNew ? undefined : products.get(c.productId)
                    return (
                      <tr key={c.kode} className="border-b border-gray-50 align-top">
                        <td className="py-2 pr-3 font-mono text-xs">
                          {c.kode}
                          {c.isNew && <span className="ml-1 rounded bg-brand-yellow px-1.5 py-0.5 font-sans text-[10px] font-bold">BARU</span>}
                        </td>
                        <td className="py-2 pr-3">
                          {old && old.name !== c.name && !done && <span className="block text-xs text-gray-400 line-through">{old.name}</span>}
                          {c.name}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-right">
                          {c.price === undefined ? (
                            <span className="text-gray-400">{old ? formatRupiah(old.price) : '–'}</span>
                          ) : (
                            <>
                              {old && old.price !== c.price && !done && <span className="block text-xs text-gray-400 line-through">{formatRupiah(old.price)}</span>}
                              <span className={old && old.price !== c.price ? 'font-bold text-brand-pink' : ''}>{formatRupiah(c.price)}</span>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!done && changed.length < u.changes.length && (
              <p className="text-xs text-gray-500">{u.changes.length - changed.length} produk lain sudah sama, tidak ditampilkan.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** Preview of a variant photo fix: per product, each variant with its wrong photo -> the new photo (or "Tanpa foto") */
function PhotoFixSection({ fix, button }: { fix: VariantPhotoFix; button: ReactNode }) {
  const variants = fix.changes.flatMap((c) => c.variants)
  const withPhoto = variants.filter((v) => v.image).length
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{fix.title}</h2>
          <p className="text-sm text-gray-500">
            {fix.changes.length} produk · {withPhoto} variasi dapat foto yang benar · {variants.length - withPhoto} variasi jadi "Tanpa foto"
          </p>
        </div>
        {button}
      </div>
      <ul className="divide-y divide-gray-100">
        {fix.changes.map((c) => (
          <li key={c.productId} className="py-3">
            <p className="mb-2 text-sm font-semibold">{c.name}</p>
            <div className="flex flex-wrap gap-3">
              {c.variants.map((v) => (
                <div key={v.id} className="flex items-center gap-1 rounded-lg bg-gray-50 p-1.5">
                  <img src={v.old} alt="" loading="lazy" title="Foto lama (salah)" className="size-12 rounded object-cover opacity-60 ring-1 ring-red-300" />
                  <ArrowRight className="size-3 text-gray-400" />
                  {v.image ? (
                    <img src={v.image} alt="" loading="lazy" title="Foto baru" className="size-12 rounded object-cover ring-2 ring-green-500" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded bg-white text-center text-[10px] leading-tight text-gray-400 ring-1 ring-gray-200">Tanpa foto</span>
                  )}
                  <span className="max-w-24 pl-1 text-xs font-medium">{v.name}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Preview of a full catalog update: counts, updated products (old -> new), new products, photos left out */
function CatalogSection({ update, hideCount, button }: { update: CatalogUpdate; hideCount: number | null; button: ReactNode }) {
  const [showAll, setShowAll] = useState(false)
  const newShown = showAll ? update.new : update.new.slice(0, 60)
  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">{update.title}</h2>
          <p className="text-sm text-gray-500">
            {update.matched.length} produk diperbarui · {update.new.length} produk baru
            {hideCount !== null && ` · ${hideCount} produk tanpa foto baru disembunyikan`}
          </p>
        </div>
        {button}
      </div>

      <details className="rounded-lg bg-gray-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Produk diperbarui ({update.matched.length}): foto lama diganti foto baru</summary>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {update.matched.map((m) => (
            <li key={m.productId} className="flex items-center gap-3 py-2">
              <img src={m.image} alt="" loading="lazy" className="size-12 shrink-0 rounded object-cover" />
              <span className="min-w-0 flex-1">
                {m.oldName !== m.name && <span className="block text-xs text-gray-400 line-through">{m.oldName}</span>}
                {m.name}
              </span>
              <span className="shrink-0 text-right">
                {m.oldPrice !== m.price && <span className="block text-xs text-gray-400 line-through">{formatRupiah(m.oldPrice)}</span>}
                <span className={m.oldPrice !== m.price ? 'font-bold text-brand-pink' : ''}>{formatRupiah(m.price)}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div>
        <p className="mb-2 text-sm font-semibold">Produk baru ({update.new.length})</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {newShown.map((p) => (
            <li key={p.id} className="rounded-lg bg-gray-50 p-1.5 text-xs">
              <img src={p.image ?? ''} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" />
              <p className="mt-1 line-clamp-2">{p.name}</p>
              <p className="font-bold text-brand-pink">{p.fromPrice && 'mulai '}{formatRupiah(p.price)}</p>
              <p className="text-gray-400">{p.categories[0]}</p>
            </li>
          ))}
        </ul>
        {!showAll && update.new.length > 60 && (
          <button onClick={() => setShowAll(true)} className="mt-2 text-sm font-semibold text-brand-pink hover:underline">
            Tampilkan semua ({update.new.length})
          </button>
        )}
      </div>

      {update.skipped.length > 0 && (
        <details className="rounded-lg bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Foto tidak dimasukkan ({update.skipped.length})</summary>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {update.skipped.map((x) => <li key={x.n}>{x.file} – {x.why}</li>)}
          </ul>
        </details>
      )}
    </section>
  )
}
