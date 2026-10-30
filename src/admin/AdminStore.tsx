// Admin "Tampilan Toko": banners (slider + 2 small), home page product rows, info bar, shop info, categories
// (rename, picture, order, add) and the "Tentang Kami" page (banner slider + text blocks).
// Everything on this page is saved together with one "Simpan" button.
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { forgetCatalog, loadFullCatalog } from '../lib/catalog'
import { saveStoreSettings } from '../lib/catalogAdmin'
import { shrinkImage } from '../lib/image'
import { bannerImage, loadStoreSettings, type AboutSection, type BannerSetting, type HomeRow, type StoreSettings } from '../lib/storeSettings'
import type { Catalog, Category } from '../types/product'
import { INPUT } from './styles'

const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export default function AdminStore() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  // banner id -> picture to show (website file, stored picture, or a new upload)
  const [pictures, setPictures] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<Map<string, string>>(new Map())
  const [removed, setRemoved] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  const [ratingText, setRatingText] = useState<string | null>(null)

  useEffect(() => {
    forgetCatalog()
    Promise.all([loadStoreSettings(), loadFullCatalog()]).then(async ([s, c]) => {
      const pics = await Promise.all([...s.slides, ...s.side, ...s.aboutSlides].map(async (b) => [b.id, (await bannerImage(b)) ?? ''] as const))
      setPictures(Object.fromEntries(pics))
      setCatalog(c)
      setCategories(c.categories)
      setSettings(s)
    }, (e: Error) => setError(e.message))
  }, [])

  if (error && !settings) return <p className="text-red-700">Gagal memuat: {error}</p>
  if (!settings || !catalog) return <Loader2 className="mx-auto size-8 animate-spin text-brand-pink" />

  const change = (next: Partial<StoreSettings>) => {
    setSettings({ ...settings, ...next })
    setState('idle')
  }
  const g = settings.googleReviews
  const setGoogle = (next: Partial<typeof g>, ratingText?: string) => {
    if (ratingText !== undefined) setRatingText(ratingText)
    change({ googleReviews: { ...g, ...next } })
  }
  const reviewsDraft = { rating: ratingText ?? (g.rating ? String(g.rating).replace('.', ',') : '') }
  const linkOptions = [{ to: '', label: 'Tidak ada link (gambar saja)' }, { to: '/produk', label: 'Semua produk' }, ...categories.map((c) => ({ to: `/kategori/${c.slug}`, label: c.name }))]

  async function upload(file: File | undefined, replaceId?: string): Promise<BannerSetting | null> {
    if (!file) return null
    try {
      const image = await shrinkImage(file, 1600, 400_000)
      const id = `b${Date.now().toString(36)}`
      setUploads((u) => new Map(u).set(id, image))
      setPictures((p) => ({ ...p, [id]: image }))
      if (replaceId) setRemoved((r) => [...r, replaceId])
      return { id, to: '/produk' }
    } catch (e) {
      setError(`Gagal mengunggah: ${(e as Error).message}`)
      return null
    }
  }

  function addCategory() {
    const name = window.prompt('Nama kategori baru:')?.trim()
    if (!name) return
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'kategori'
    let slug = base
    for (let i = 2; categories.some((c) => c.slug === slug); i++) slug = `${base}-${i}`
    setCategories([...categories, { name, slug, count: 0, image: null }])
    setState('idle')
  }

  async function save() {
    for (const r of settings!.homeRows) if (!r.title.trim()) return setError('Setiap baris produk harus punya judul.')
    for (const a of settings!.aboutSections) if (!a.title.trim()) return setError('Setiap bagian Tentang Kami harus punya judul.')
    for (const c of categories) if (!c.name.trim()) return setError('Setiap kategori harus punya nama.')
    if (!settings!.shop.whatsappDisplay.replace(/\D/g, '')) return setError('Nomor WhatsApp wajib diisi.')
    setError('')
    setState('saving')
    try {
      // only upload pictures that are still used, delete stored pictures that are no longer used
      const used = new Set([...settings!.slides, ...settings!.side, ...settings!.aboutSlides].map((b) => b.id))
      const toUpload = new Map([...uploads].filter(([id]) => used.has(id)))
      const toRemove = removed.filter((id) => !used.has(id) && !uploads.has(id))
      await saveStoreSettings(settings!, toUpload, toRemove, categories)
      setUploads(new Map())
      setRemoved([])
      setState('saved')
    } catch (e) {
      setError(`Gagal menyimpan: ${(e as Error).message}`)
      setState('idle')
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-xl font-bold">Tampilan Toko</h1>

      <Section title="1. Banner geser (besar)" hint="Ukuran terbaik 16:9, misalnya 1600 x 900 px.">
        <ul className="space-y-2">
          {settings.slides.map((b, i) => (
            <BannerRow
              key={b.id}
              picture={pictures[b.id]}
              banner={b}
              linkOptions={linkOptions}
              onLink={(to) => change({ slides: settings.slides.map((x) => (x.id === b.id ? { ...x, to } : x)) })}
              onUp={() => change({ slides: move(settings.slides, i, i - 1) })}
              onDown={() => change({ slides: move(settings.slides, i, i + 1) })}
              onRemove={() => {
                if (!window.confirm('Hapus banner ini?')) return
                setRemoved((r) => [...r, b.id])
                change({ slides: settings.slides.filter((x) => x.id !== b.id) })
              }}
            />
          ))}
        </ul>
        <UploadButton label="Tambah banner" onFile={async (f) => {
          const b = await upload(f)
          if (b) change({ slides: [...settings.slides, b] })
        }} />
      </Section>

      <Section title="2. Banner kecil (2)" hint="Tampil di kanan banner geser (di HP: di bawahnya).">
        <ul className="space-y-2">
          {settings.side.map((b, i) => (
            <BannerRow
              key={b.id}
              picture={pictures[b.id]}
              banner={b}
              linkOptions={linkOptions}
              onLink={(to) => change({ side: settings.side.map((x) => (x.id === b.id ? { ...x, to } : x)) })}
              replace={async (f) => {
                const nb = await upload(f, b.id)
                if (nb) change({ side: settings.side.map((x, j) => (j === i ? { ...nb, to: b.to } : x)) })
              }}
            />
          ))}
        </ul>
      </Section>

      <Section title="3. Baris produk di Beranda" hint="Judul + kategori. &quot;Produk terbaru&quot; = produk paling baru dari semua kategori.">
        <ul className="space-y-2">
          {settings.homeRows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2">
              <input value={r.title} onChange={(e) => change({ homeRows: settings.homeRows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Judul" aria-label="Judul baris" className={`${INPUT} min-w-48 flex-1`} />
              <select value={r.category} onChange={(e) => change({ homeRows: settings.homeRows.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)) })} aria-label="Kategori baris" className={`${INPUT} w-auto`}>
                <option value="">Produk terbaru</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              <OrderButtons onUp={() => change({ homeRows: move(settings.homeRows, i, i - 1) })} onDown={() => change({ homeRows: move(settings.homeRows, i, i + 1) })} />
              <IconButton label="Hapus baris" onClick={() => change({ homeRows: settings.homeRows.filter((_, j) => j !== i) })}><X className="size-4" /></IconButton>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => change({ homeRows: [...settings.homeRows, { title: '', category: '' } as HomeRow] })} className="flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          <Plus className="size-4" /> Tambah baris
        </button>
      </Section>

      <Section title="4. Info bar (strip pink di atas, tampil di komputer)" hint="Kosongkan kalau tidak ada promo.">
        <input value={settings.infoBar} onChange={(e) => change({ infoBar: e.target.value })} maxLength={120} placeholder="Contoh: Diskon 10% per dus balon s/d 31 Desember" className={INPUT} />
      </Section>

      <Section title="5. Info toko" hint="Nomor WhatsApp ini menerima semua pesanan dari website.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nomor WhatsApp"><input value={settings.shop.whatsappDisplay} onChange={(e) => change({ shop: { ...settings.shop, whatsappDisplay: e.target.value } })} placeholder="0812-0000-0000" inputMode="tel" className={INPUT} /></Field>
          <Field label="Jam buka"><input value={settings.shop.hours} onChange={(e) => change({ shop: { ...settings.shop, hours: e.target.value } })} placeholder="Senin–Sabtu 08.00–16.00" className={INPUT} /></Field>
          <Field label="Alamat"><input value={settings.shop.address} onChange={(e) => change({ shop: { ...settings.shop, address: e.target.value } })} className={INPUT} /></Field>
          <Field label="Instagram (tanpa @)"><input value={settings.shop.instagram} onChange={(e) => change({ shop: { ...settings.shop, instagram: e.target.value.replace(/^@/, '') } })} className={INPUT} /></Field>
          <Field label="Link Google Maps"><input value={settings.shop.mapsUrl} onChange={(e) => change({ shop: { ...settings.shop, mapsUrl: e.target.value } })} className={INPUT} /></Field>
        </div>
      </Section>

      <Section title="6. Kategori" hint="Nama, gambar bulat dan urutan. 16 kategori teratas tampil di Beranda. Kategori baru tampil di toko setelah ada produk di dalamnya (pilih kategorinya di halaman produk).">
        <ul className="space-y-2">
          {categories.map((c, i) => (
            <CategoryRow
              key={c.slug}
              category={c}
              photos={catalog.products.filter((p) => !p.hidden && p.image && p.categories.includes(c.slug)).map((p) => p.image!)}
              onChange={(next) => { setCategories(categories.map((x) => (x.slug === c.slug ? next : x))); setState('idle') }}
              onUp={() => { setCategories(move(categories, i, i - 1)); setState('idle') }}
              onDown={() => { setCategories(move(categories, i, i + 1)); setState('idle') }}
            />
          ))}
        </ul>
        <button type="button" onClick={addCategory} className="flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          <Plus className="size-4" /> Tambah kategori
        </button>
      </Section>

      <Section title="7. Halaman Tentang Kami" hint="Banner geser di atas halaman, lalu bagian-bagian teks (judul + isi). Tekan Enter untuk baris baru.">
        <p className="text-sm font-semibold">Banner</p>
        <ul className="space-y-2">
          {settings.aboutSlides.map((b, i) => (
            <BannerRow
              key={b.id}
              picture={pictures[b.id]}
              banner={b}
              linkOptions={linkOptions}
              onLink={(to) => change({ aboutSlides: settings.aboutSlides.map((x) => (x.id === b.id ? { ...x, to } : x)) })}
              onUp={() => change({ aboutSlides: move(settings.aboutSlides, i, i - 1) })}
              onDown={() => change({ aboutSlides: move(settings.aboutSlides, i, i + 1) })}
              onRemove={() => {
                if (!window.confirm('Hapus banner ini?')) return
                setRemoved((r) => [...r, b.id])
                change({ aboutSlides: settings.aboutSlides.filter((x) => x.id !== b.id) })
              }}
            />
          ))}
        </ul>
        <UploadButton label="Tambah banner" onFile={async (f) => {
          const b = await upload(f)
          if (b) change({ aboutSlides: [...settings.aboutSlides, b] })
        }} />

        <p className="pt-2 text-sm font-semibold">Bagian teks</p>
        <ul className="space-y-2">
          {settings.aboutSections.map((a, i) => (
            <li key={i} className="space-y-2 rounded-lg bg-gray-50 p-2">
              <div className="flex items-center gap-2">
                <input value={a.title} onChange={(e) => change({ aboutSections: settings.aboutSections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Judul, misalnya Cara Kerja" aria-label="Judul bagian" className={`${INPUT} flex-1 font-semibold`} />
                <OrderButtons onUp={() => change({ aboutSections: move(settings.aboutSections, i, i - 1) })} onDown={() => change({ aboutSections: move(settings.aboutSections, i, i + 1) })} />
                <IconButton label="Hapus bagian" onClick={() => window.confirm(`Hapus bagian "${a.title}"?`) && change({ aboutSections: settings.aboutSections.filter((_, j) => j !== i) })}><X className="size-4" /></IconButton>
              </div>
              <textarea value={a.text} onChange={(e) => change({ aboutSections: settings.aboutSections.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} rows={4} maxLength={3000} aria-label="Isi bagian" className={INPUT} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => change({ aboutSections: [...settings.aboutSections, { title: '', text: '' } as AboutSection] })} className="flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          <Plus className="size-4" /> Tambah bagian
        </button>
      </Section>

      <Section title="8. Ulasan Google (di halaman Tentang Kami)" hint="Salin dari Google Maps: nilai bintang, jumlah ulasan, dan beberapa ulasan pilihan. Kalau diklik, pembeli dibawa ke ulasan di Google Maps.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nilai (misalnya 4,8)">
            <input inputMode="decimal" value={reviewsDraft.rating} onChange={(e) => setGoogle({ rating: Math.min(5, Number(e.target.value.replace(',', '.')) || 0) }, e.target.value)} className={INPUT} />
          </Field>
          <Field label="Jumlah ulasan">
            <input inputMode="numeric" value={g.count || ''} onChange={(e) => setGoogle({ count: Number(e.target.value.replace(/\D/g, '')) || 0 })} className={INPUT} />
          </Field>
          <Field label="Link Google Maps (ulasan)">
            <input value={g.url} onChange={(e) => setGoogle({ url: e.target.value.trim() })} className={INPUT} />
          </Field>
          <Field label="Link tombol &quot;Tulis ulasan&quot;">
            <input value={g.writeUrl} onChange={(e) => setGoogle({ writeUrl: e.target.value.trim() })} className={INPUT} />
          </Field>
        </div>
        <p className="pt-2 text-sm font-semibold">Ulasan pilihan</p>
        <ul className="space-y-2">
          {g.quotes.map((q, i) => (
            <li key={i} className="space-y-2 rounded-lg bg-gray-50 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <input value={q.name} onChange={(e) => setGoogle({ quotes: g.quotes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Nama" aria-label="Nama pengulas" className={`${INPUT} min-w-40 flex-1`} />
                <select value={q.stars} onChange={(e) => setGoogle({ quotes: g.quotes.map((x, j) => (j === i ? { ...x, stars: Number(e.target.value) } : x)) })} aria-label="Bintang" className={`${INPUT} w-auto`}>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
                <OrderButtons onUp={() => setGoogle({ quotes: move(g.quotes, i, i - 1) })} onDown={() => setGoogle({ quotes: move(g.quotes, i, i + 1) })} />
                <IconButton label="Hapus ulasan" onClick={() => setGoogle({ quotes: g.quotes.filter((_, j) => j !== i) })}><X className="size-4" /></IconButton>
              </div>
              <textarea value={q.text} onChange={(e) => setGoogle({ quotes: g.quotes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} rows={2} maxLength={600} placeholder="Isi ulasan" aria-label="Isi ulasan" className={INPUT} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setGoogle({ quotes: [...g.quotes, { name: '', stars: 5, text: '' }] })} className="flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          <Plus className="size-4" /> Tambah ulasan
        </button>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3">
          {error && <span className="mr-auto text-sm text-red-700">{error}</span>}
          {state === 'saved' && <span className="flex items-center gap-1 text-sm font-semibold text-green-700"><Check className="size-4" /> Tersimpan, sudah tampil di toko</span>}
          <button onClick={save} disabled={state === 'saving'} className="flex items-center gap-2 rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white disabled:opacity-60">
            {state === 'saving' && <Loader2 className="size-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-sm text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-8 place-items-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-ink">
      {children}
    </button>
  )
}

function OrderButtons({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (
    <span className="flex">
      <IconButton label="Naik" onClick={onUp}><ArrowUp className="size-4" /></IconButton>
      <IconButton label="Turun" onClick={onDown}><ArrowDown className="size-4" /></IconButton>
    </span>
  )
}

function UploadButton({ label, onFile }: { label: string; onFile: (f: File | undefined) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
      <ImagePlus className="size-4" /> {label}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
    </label>
  )
}

function BannerRow(props: {
  picture?: string
  banner: BannerSetting
  linkOptions: { to: string; label: string }[]
  onLink: (to: string) => void
  onUp?: () => void
  onDown?: () => void
  onRemove?: () => void
  replace?: (f: File | undefined) => void
}) {
  const { picture, banner, linkOptions } = props
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-2">
      {picture ? <img src={picture} alt="" className="aspect-video w-40 rounded object-cover" /> : <span className="aspect-video w-40 rounded bg-gray-200" />}
      <label className="flex min-w-48 flex-1 items-center gap-2 text-sm">
        <span className="shrink-0 text-gray-500">Kalau diklik ke:</span>
        <select value={banner.to} onChange={(e) => props.onLink(e.target.value)} className={INPUT}>
          {!linkOptions.some((o) => o.to === banner.to) && <option value={banner.to}>{banner.to}</option>}
          {linkOptions.map((o) => <option key={o.to} value={o.to}>{o.label}</option>)}
        </select>
      </label>
      {props.replace && <UploadButton label="Ganti gambar" onFile={props.replace} />}
      {props.onUp && props.onDown && <OrderButtons onUp={props.onUp} onDown={props.onDown} />}
      {props.onRemove && <IconButton label="Hapus banner" onClick={props.onRemove}><X className="size-4" /></IconButton>}
    </li>
  )
}

function CategoryRow(props: { category: Category; photos: string[]; onChange: (c: Category) => void; onUp: () => void; onDown: () => void }) {
  const { category: c, photos } = props
  const [picking, setPicking] = useState(false)
  return (
    <li className="space-y-2 rounded-lg bg-gray-50 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPicking(!picking)} title="Pilih gambar" className="size-12 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-brand-yellow">
          {c.image && <img src={c.image} alt="" className="size-full object-cover" />}
        </button>
        <input value={c.name} onChange={(e) => props.onChange({ ...c, name: e.target.value })} aria-label="Nama kategori" className={`${INPUT} min-w-40 flex-1`} />
        <span className="text-xs text-gray-500">{c.count} produk</span>
        <OrderButtons onUp={props.onUp} onDown={props.onDown} />
      </div>
      {picking && (
        <div className="flex flex-wrap gap-2 rounded-lg bg-white p-2 ring-1 ring-brand-pink/30">
          {photos.length === 0 && <p className="text-xs text-gray-500">Belum ada produk dengan foto di kategori ini.</p>}
          {photos.slice(0, 24).map((src) => (
            <button key={src} type="button" onClick={() => { props.onChange({ ...c, image: src }); setPicking(false) }} className={`size-14 overflow-hidden rounded-full ring-2 ${c.image === src ? 'ring-brand-pink' : 'ring-gray-100 hover:ring-brand-yellow'}`}>
              <img src={src} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
