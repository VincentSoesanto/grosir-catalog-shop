// Admin "Impor Foto": drop photos named KODE_Nama_Harga.jpg -> check/edit the table -> Impor.
// Below: the history of earlier imports.
import { ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgetCatalog, loadFullCatalog } from '../lib/catalog'
import { FALLBACK_CATEGORY, guessCategory, importRows, loadImportHistory, parseFileName, type ImportHistory, type ImportRow } from '../lib/photoImport'
import { formatRupiah } from '../lib/shop'
import type { Catalog } from '../types/product'
import { INPUT } from './styles'

const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminImport() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ImportHistory[] | null>(null)

  useEffect(() => {
    forgetCatalog()
    loadFullCatalog().then(setCatalog)
    loadImportHistory().then(setHistory, () => setHistory([]))
  }, [])

  const categories = catalog
    ? catalog.categories.some((c) => c.slug === FALLBACK_CATEGORY.slug)
      ? catalog.categories
      : [...catalog.categories, { ...FALLBACK_CATEGORY, count: 0, image: null }]
    : []

  function addFiles(list: FileList | File[]) {
    if (!catalog) return
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'))
    const bySku = new Map(catalog.products.map((p) => [p.sku.toUpperCase(), p.id]))
    const next = files.map((file): ImportRow => {
      const { kode, name, price, problem } = parseFileName(file.name)
      return {
        key: `${file.name}-${file.size}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        kode,
        name,
        price,
        category: guessCategory(kode, catalog.products, catalog.categories),
        existingId: bySku.get(kode) ?? null,
        problem,
      }
    })
    setRows((cur) => [...cur, ...next])
    setMessage('')
  }

  function update(key: string, changes: Partial<ImportRow>) {
    setRows((cur) =>
      cur.map((r) => {
        if (r.key !== key) return r
        const next = { ...r, ...changes }
        if (changes.kode !== undefined && catalog) {
          next.kode = changes.kode.toUpperCase()
          next.existingId = catalog.products.find((p) => p.sku.toUpperCase() === next.kode)?.id ?? null
        }
        next.problem = !next.kode ? 'Kode kosong' : !next.name.trim() ? 'Nama kosong' : !(next.price > 0) ? 'Harga tidak terbaca' : ''
        return next
      }),
    )
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const ready = rows.filter((r) => !r.problem)
  const kodeTwice = new Set(ready.map((r) => r.kode).filter((k, i, all) => all.indexOf(k) !== i))

  async function start() {
    if (kodeTwice.size) return setMessage(`Kode dobel: ${[...kodeTwice].join(', ')}. Hapus salah satu.`)
    if (!window.confirm(`Impor ${ready.length} foto ke katalog?`)) return
    setBusy('Menyimpan…')
    try {
      await importRows(ready, (d, t) => setBusy(`Menyimpan ${d} / ${t}…`))
      setRows((cur) => cur.filter((r) => r.problem))
      setMessage(`✓ ${ready.length} produk diimpor, sudah tampil di toko.`)
      forgetCatalog()
      loadFullCatalog().then(setCatalog)
      loadImportHistory().then(setHistory)
    } catch (e) {
      setMessage(`Gagal: ${(e as Error).message}`)
    } finally {
      setBusy('')
    }
  }

  if (!catalog) return <Loader2 className="mx-auto size-8 animate-spin text-brand-pink" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Impor Foto</h1>
        <p className="text-sm text-gray-500">
          Nama file: <span className="font-mono">KODE_Nama Barang_Harga</span>, contoh <span className="font-mono">SP101-4C_Acrylic Marker Black_13200.jpg</span>.
          Kode yang sudah ada = produk itu diperbarui (nama, harga, foto baru).
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-300 bg-white hover:border-brand-pink'}`}
      >
        <Upload className="size-8 text-brand-pink" />
        <span className="font-semibold">Tarik & lepas foto ke sini</span>
        <span className="text-sm text-gray-500">atau klik untuk memilih file (bisa banyak sekaligus)</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
      </label>

      {rows.length > 0 && (
        <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <b>{rows.length}</b> foto · {ready.filter((r) => !r.existingId).length} baru · {ready.filter((r) => r.existingId).length} perbarui produk lama
              {rows.length > ready.length && <span className="text-red-700"> · {rows.length - ready.length} perlu dibetulkan</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRows([])} disabled={!!busy} className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-200">Kosongkan</button>
              <button onClick={start} disabled={!!busy || ready.length === 0} className="flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? <><Loader2 className="size-4 animate-spin" /> {busy}</> : <><ImagePlus className="size-4" /> Impor {ready.length} foto</>}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-2">Foto</th><th className="py-2 pr-2">Kode</th><th className="py-2 pr-2">Nama</th>
                  <th className="py-2 pr-2">Harga</th><th className="py-2 pr-2">Kategori</th><th className="py-2 pr-2">Status</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={`border-b border-gray-50 align-middle ${r.problem ? 'bg-red-50' : ''}`}>
                    <td className="py-1.5 pr-2"><img src={r.preview} alt="" className="size-12 rounded object-cover" /></td>
                    <td className="py-1.5 pr-2"><input value={r.kode} onChange={(e) => update(r.key, { kode: e.target.value })} aria-label="Kode" className={`${INPUT} w-28 font-mono`} /></td>
                    <td className="py-1.5 pr-2"><input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} aria-label="Nama" className={`${INPUT} min-w-56`} /></td>
                    <td className="py-1.5 pr-2">
                      <input inputMode="numeric" value={r.price ? r.price.toLocaleString('id-ID') : ''} onChange={(e) => update(r.key, { price: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label="Harga" className={`${INPUT} w-28 text-right`} />
                    </td>
                    <td className="py-1.5 pr-2">
                      {r.existingId ? (
                        <span className="text-xs text-gray-500">tetap</span>
                      ) : (
                        <select value={r.category} onChange={(e) => update(r.key, { category: e.target.value })} aria-label="Kategori" className={`${INPUT} w-44`}>
                          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-xs">
                      {r.problem ? <span className="font-semibold text-red-700">{r.problem}</span> : r.existingId ? (
                        <Link to={`/admin/produk/${r.existingId}`} target="_blank" className="font-semibold text-amber-700 underline">Perbarui produk lama</Link>
                      ) : <span className="font-semibold text-green-700">Baru</span>}
                    </td>
                    <td><button onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))} aria-label="Hapus baris" className="p-1 text-gray-400 hover:text-red-600"><X className="size-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {message && <p className={`rounded-lg p-3 text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{message}</p>}

      <section className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
        <h2 className="font-bold">Riwayat impor</h2>
        {history === null ? <Loader2 className="size-5 animate-spin text-brand-pink" /> : history.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada impor.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <details>
                  <summary className="cursor-pointer text-sm">
                    <b>{dateTime.format(new Date(h.date))}</b> · {h.items.length} produk ({h.items.filter((i) => i.isNew).length} baru, {h.items.filter((i) => !i.isNew).length} diperbarui)
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 text-xs">
                    {h.items.map((i) => (
                      <li key={i.productId}>
                        <Link to={`/admin/produk/${i.productId}`} className="hover:text-brand-pink hover:underline">{i.name}</Link>
                        <span className="text-gray-500"> · {formatRupiah(i.price)} · {i.isNew ? 'baru' : 'diperbarui'}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
