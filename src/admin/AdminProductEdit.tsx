// Admin: add (/admin/produk/baru) or edit one product (name, photos, code, price, stock, show/hide, categories,
// description, variants with their photo), delete it, and manage its testimonial screenshots.
import { ArrowLeft, Check, ExternalLink, ImageOff, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { forgetCatalog, loadFullCatalog, loadProduct } from '../lib/catalog'
import { addTestimonial, deleteProduct, deleteTestimonial, productIdFree, saveProduct } from '../lib/catalogAdmin'
import { shrinkImage, shrinkUrl } from '../lib/image'
import { allPhotos, photoRef, variantPhoto } from '../lib/photos'
import { loadTestimonials } from '../lib/reviews'
import type { Category, ProductDetail, Variant } from '../types/product'
import type { Testimonial } from '../types/review'
import { INPUT } from './styles'

export default function AdminProductEdit() {
  const { id = '' } = useParams()
  const [product, setProduct] = useState<ProductDetail | null | undefined>(undefined)
  const [categories, setCategories] = useState<Category[]>([])

  const isNew = id === 'baru'

  useEffect(() => {
    forgetCatalog() // always edit the latest data
    const load = isNew ? Promise.resolve(emptyProduct()) : loadProduct(id, true)
    load.then(setProduct, () => setProduct(null))
    loadFullCatalog().then((c) => setCategories(c.categories))
  }, [id, isNew])

  if (product === undefined) return <Loader2 className="mx-auto size-8 animate-spin text-brand-pink" />
  if (product === null) return <p>Produk tidak ditemukan. <Link to="/admin" className="text-brand-pink underline">Kembali</Link></p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-brand-pink">
          <ArrowLeft className="size-4" /> Semua produk
        </Link>
        {isNew ? (
          <h1 className="ml-auto font-bold">Produk baru</h1>
        ) : (
          <Link to={`/produk/${product.id}`} target="_blank" className="ml-auto flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
            Lihat di toko <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
      <ProductForm key={product.id || 'baru'} initial={product} categories={categories} isNew={isNew} />
      {!isNew && <TestimonialManager productId={product.id} />}
    </div>
  )
}

function emptyProduct(): ProductDetail {
  return {
    id: '', sku: '', name: '', price: 0, fromPrice: false, hasVariants: false, categories: [], image: null,
    inStock: true, images: [], variantLabel: 'Variasi', variants: [], description: '',
  }
}

/** New product id: from the kode (e.g. "at101"), or from the time when there is no kode */
async function newProductId(kode: string) {
  const base = kode.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `p${Date.now().toString(36)}`
  let id = base
  for (let i = 2; !(await productIdFree(id)); i++) id = `${base}-${i}`
  return id
}

function ProductForm({ initial, categories, isNew }: { initial: ProductDetail; categories: Category[]; isNew: boolean }) {
  const navigate = useNavigate()
  const [p, setP] = useState<ProductDetail>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  const hasVariants = p.variants.length > 0
  // Photos are edited here and saved with "Simpan". The first photo is the main photo.
  const [photos, setPhotos] = useState<string[]>(() => allPhotos(initial))
  // Which photo each variant shows (by variant id); null = none
  const [variantPhotos, setVariantPhotos] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(initial.variants.map((v) => [v.id, variantPhoto(initial, v)])),
  )
  const [picker, setPicker] = useState<string | null>(null) // variant whose photo choice is open
  const [uploading, setUploading] = useState(false)

  const set = <K extends keyof ProductDetail>(key: K, value: ProductDetail[K]) => {
    setP((cur) => ({ ...cur, [key]: value }))
    setState('idle')
  }
  const setVariant = (index: number, changes: Partial<Variant>) =>
    set('variants', p.variants.map((v, i) => (i === index ? { ...v, ...changes } : v)))

  function addVariant() {
    set('variants', [...p.variants, { id: `${p.id}-${Date.now()}`, name: '', sku: '', price: p.price, inStock: true, image: null }])
  }

  async function addPhotos(files: FileList | null, forVariant?: string) {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const added: string[] = []
      for (const file of Array.from(files)) added.push(await shrinkImage(file, 1000, 160_000))
      setPhotos((cur) => [...cur, ...added])
      if (forVariant) {
        setVariantPhotos((cur) => ({ ...cur, [forVariant]: added[0] }))
        setPicker(null)
      }
      setState('idle')
    } catch (err) {
      setError(`Gagal menambah foto: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  function makeMain(src: string) {
    setPhotos((cur) => [src, ...cur.filter((x) => x !== src)])
    setState('idle')
  }

  function removePhoto(src: string) {
    const users = p.variants.filter((v) => variantPhotos[v.id] === src).map((v) => v.name)
    const question = users.length ? `Foto ini dipakai variasi ${users.join(', ')}. Tetap hapus?` : 'Hapus foto ini?'
    if (!window.confirm(question)) return
    setPhotos((cur) => cur.filter((x) => x !== src))
    setVariantPhotos((cur) => Object.fromEntries(Object.entries(cur).map(([id, x]) => [id, x === src ? null : x])))
    setState('idle')
  }

  function chooseVariantPhoto(variantId: string, src: string | null) {
    setVariantPhotos((cur) => ({ ...cur, [variantId]: src }))
    setPicker(null)
    setState('idle')
  }

  function toggleCategory(slug: string) {
    const next = p.categories.includes(slug) ? p.categories.filter((c) => c !== slug) : [...p.categories, slug]
    set('categories', next)
  }

  async function remove() {
    if (!window.confirm(`Hapus "${p.name}" selamanya? Produk ini dan testimoninya tidak bisa dikembalikan.`)) return
    setState('saving')
    try {
      await deleteProduct(p.id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(`Gagal menghapus: ${(err as Error).message}`)
      setState('idle')
    }
  }

  function check(): string {
    if (!p.name.trim()) return 'Nama produk wajib diisi.'
    if (p.categories.length === 0) return 'Pilih minimal 1 kategori.'
    if (!hasVariants && !(p.price > 0)) return 'Harga harus lebih dari 0.'
    for (const v of p.variants) {
      if (!v.name.trim()) return 'Setiap variasi harus punya nama.'
      if (!(v.price > 0)) return `Harga variasi "${v.name}" harus lebih dari 0.`
    }
    return ''
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const problem = check()
    setError(problem)
    if (problem) return
    if (isNew && photos.length === 0) {
      setError('Tambahkan minimal 1 foto.')
      return
    }
    setState('saving')
    try {
      const id = isNew ? await newProductId(p.sku || p.variants[0]?.sku || '') : p.id
      const product: ProductDetail = {
        ...p,
        id,
        name: p.name.trim(),
        images: photos,
        image: await listPicture(id, photos[0]),
        variants: p.variants.map((v) => {
          const src = variantPhotos[v.id] ?? null
          return { ...v, name: v.name.trim(), sku: v.sku.trim(), image: src ? photoRef(photos.indexOf(src)) : null }
        }),
      }
      // One product is one database document (max 1 MB); uploaded photos count towards it
      if (JSON.stringify(product).length > 950_000) {
        setError('Foto terlalu banyak untuk 1 produk. Hapus beberapa foto yang diunggah, lalu simpan lagi.')
        setState('idle')
        return
      }
      await saveProduct(product)
      setState('saved')
      if (isNew) navigate(`/admin/produk/${id}`, { replace: true })
    } catch (err) {
      setError(`Gagal menyimpan: ${(err as Error).message}`)
      setState('idle')
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <div className="flex gap-4">
        {photos[0] && <img src={photos[0]} alt="" className="size-20 shrink-0 rounded-lg object-cover ring-1 ring-gray-100" />}
        <label className="block flex-1 space-y-1">
          <span className="text-sm font-semibold">Nama produk</span>
          <input value={p.name} onChange={(e) => set('name', e.target.value)} maxLength={150} className={INPUT} />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Foto ({photos.length})</legend>
        <ul className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <li key={src} className="w-24">
              <div className={`relative size-24 overflow-hidden rounded-lg bg-gray-50 ring-2 ${i === 0 ? 'ring-brand-pink' : 'ring-gray-100'}`}>
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand-pink px-1.5 py-0.5 text-[10px] font-bold text-white">UTAMA</span>}
                <button type="button" onClick={() => removePhoto(src)} aria-label="Hapus foto" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-red-600 shadow">
                  <X className="size-3.5" />
                </button>
              </div>
              {i > 0 && (
                <button type="button" onClick={() => makeMain(src)} className="mt-1 w-full text-center text-[11px] font-semibold text-brand-pink hover:underline">
                  Jadikan utama
                </button>
              )}
            </li>
          ))}
          <li>
            <label className="grid size-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-300 text-center text-xs font-semibold text-gray-500 hover:border-brand-pink hover:text-brand-pink">
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <span><ImagePlus className="mx-auto mb-1 size-5" />Tambah foto</span>}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading} onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
            </label>
          </li>
        </ul>
        <p className="text-xs text-gray-500">Foto pertama (UTAMA) tampil di daftar produk. Foto baru otomatis diperkecil.</p>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Toggle label="Tampil di toko" checked={!p.hidden} onChange={(on) => set('hidden', !on)} />
        {!hasVariants && <Toggle label="Stok tersedia" checked={p.inStock} onChange={(on) => set('inStock', on)} />}
      </div>

      {!hasVariants && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Harga (Rp)</span>
            <PriceInput value={p.price} onChange={(n) => set('price', n)} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">Kode produk</span>
            <input value={p.sku} onChange={(e) => set('sku', e.target.value)} maxLength={40} className={`${INPUT} font-mono`} />
          </label>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Variasi {hasVariants && `(${p.variants.length})`}</legend>
        {hasVariants && (
          <div className="space-y-2">
            {p.variants.map((v, i) => (
              <div key={v.id} className="grid grid-cols-2 items-center gap-2 rounded-lg bg-gray-50 p-2 sm:grid-cols-[1fr_8rem_9rem_auto_auto]">
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => setPicker(picker === v.id ? null : v.id)}
                    aria-label={`Pilih foto variasi ${v.name}`}
                    title="Pilih foto variasi"
                    className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-2 ${picker === v.id ? 'ring-brand-pink' : 'ring-gray-200 hover:ring-brand-yellow'}`}
                  >
                    {variantPhotos[v.id] ? <img src={variantPhotos[v.id]!} alt="" className="size-full object-cover" /> : <ImageOff className="size-4 text-gray-400" />}
                  </button>
                  <input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder="Nama variasi" aria-label="Nama variasi" className={INPUT} />
                </div>
                <input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder="Kode" aria-label="Kode variasi" className={`${INPUT} font-mono`} />
                <PriceInput value={v.price} onChange={(n) => setVariant(i, { price: n })} />
                <Toggle small label="Ada" checked={v.inStock} onChange={(on) => setVariant(i, { inStock: on })} />
                <button
                  type="button"
                  onClick={() => window.confirm(`Hapus variasi "${v.name}"?`) && set('variants', p.variants.filter((_, j) => j !== i))}
                  aria-label={`Hapus variasi ${v.name}`}
                  className="justify-self-end p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
                {picker === v.id && (
                  <div className="col-span-full space-y-2 rounded-lg bg-white p-2 ring-1 ring-brand-pink/30">
                    <p className="text-xs font-semibold">Foto untuk variasi "{v.name}":</p>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => chooseVariantPhoto(v.id, src)}
                          className={`size-16 overflow-hidden rounded-lg ring-2 ${variantPhotos[v.id] === src ? 'ring-brand-pink' : 'ring-gray-100 hover:ring-brand-yellow'}`}
                        >
                          <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                        </button>
                      ))}
                      <button type="button" onClick={() => chooseVariantPhoto(v.id, null)} className={`grid size-16 place-items-center rounded-lg text-[11px] font-semibold text-gray-500 ring-2 ${variantPhotos[v.id] ? 'ring-gray-100' : 'ring-brand-pink'}`}>
                        Tanpa foto
                      </button>
                      <label className="grid size-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-gray-300 text-center text-[11px] font-semibold text-gray-500 hover:border-brand-pink">
                        {uploading ? <Loader2 className="size-4 animate-spin" /> : 'Unggah baru'}
                        <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { addPhotos(e.target.files, v.id); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addVariant} className="flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          <Plus className="size-4" /> Tambah variasi
        </button>
        {!hasVariants && <p className="text-xs text-gray-500">Produk tanpa variasi memakai harga & kode di atas.</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Kategori</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = p.categories.includes(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-yellow/40'}`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Deskripsi</span>
        <textarea value={p.description} onChange={(e) => set('description', e.target.value)} rows={6} maxLength={5000} className={INPUT} />
      </label>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{error}</p>}

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-4 py-3 md:-mx-6 md:-mb-6 md:px-6">
        {!isNew && (
          <button type="button" onClick={remove} className="mr-auto flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline">
            <Trash2 className="size-4" /> Hapus produk
          </button>
        )}
        {state === 'saved' && <span className="flex items-center gap-1 text-sm font-semibold text-green-700"><Check className="size-4" /> Tersimpan, sudah tampil di toko</span>}
        <button disabled={state === 'saving'} className="flex items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          {state === 'saving' && <Loader2 className="size-4 animate-spin" />} Simpan
        </button>
      </div>
    </form>
  )
}

/** The small picture used in product lists: the main photo (uploaded photos get a small copy) */
async function listPicture(productId: string, main: string | undefined): Promise<string | null> {
  if (!main) return null
  if (main.startsWith('data:')) return shrinkUrl(main, 320, 30_000)
  // A product photo from the catalog files also has a ready-made small version
  if (main === `/img/products/large/${productId}.svg`) return `/img/products/${productId}.svg`
  return main
}

function PriceInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      inputMode="numeric"
      value={value ? value.toLocaleString('id-ID') : ''}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      placeholder="0"
      aria-label="Harga"
      className={`${INPUT} text-right font-semibold`}
    />
  )
}

function Toggle({ label, checked, onChange, small }: { label: string; checked: boolean; onChange: (on: boolean) => void; small?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 ${small ? 'text-xs' : 'text-sm font-semibold'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-10 rounded-full bg-gray-300 transition peer-checked:bg-green-500 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-pink" />
      {label}
    </label>
  )
}

function TestimonialManager({ productId }: { productId: string }) {
  const [items, setItems] = useState<Testimonial[] | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = () => loadTestimonials(productId).then(setItems)
  useEffect(() => {
    loadTestimonials(productId).then(setItems)
  }, [productId])

  async function upload(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await addTestimonial(productId, file, caption)
      setFile(null)
      setCaption('')
      ;(e.target as HTMLFormElement).reset()
      await reload()
    } catch (err) {
      setError(`Gagal mengunggah: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function remove(t: Testimonial) {
    if (!window.confirm('Hapus testimoni ini?')) return
    await deleteTestimonial(t.id)
    await reload()
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <div>
        <h2 className="font-bold">Testimoni Pembeli</h2>
        <p className="text-sm text-gray-500">Unggah screenshot chat WhatsApp dari pembeli yang puas. Tampil di halaman produk ini.</p>
      </div>

      {items === null ? (
        <Loader2 className="size-6 animate-spin text-brand-pink" />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada testimoni.</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {items.map((t) => (
            <li key={t.id} className="relative w-28">
              <img src={t.image} alt={t.caption ?? ''} className="aspect-[9/16] w-full rounded-lg object-cover object-top ring-1 ring-gray-200" />
              <button onClick={() => remove(t)} aria-label="Hapus testimoni" className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/90 text-red-600 shadow">
                <Trash2 className="size-4" />
              </button>
              {t.caption && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{t.caption}</p>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={upload} className="flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3">
        <label className="space-y-1">
          <span className="text-sm font-semibold">Screenshot</span>
          <input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-yellow file:px-4 file:py-2 file:font-semibold" />
        </label>
        <label className="min-w-48 flex-1 space-y-1">
          <span className="text-sm font-semibold">Keterangan <span className="font-normal text-gray-400">(opsional)</span></span>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={100} placeholder="Contoh: Pembeli dari Jakarta" className={INPUT} />
        </label>
        <button disabled={!file || busy} className="flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Unggah
        </button>
      </form>
      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
    </section>
  )
}
