// Keranjang: change quantities, remove items, fill in name (+ optional address/note), then "Pesan via WhatsApp".
// WhatsApp opens with the whole order written out; nothing is saved on the website.
import { AlertTriangle, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { WhatsAppIcon } from '../components/BrandIcons'
import QtyStepper from '../components/QtyStepper'
import { useCart, type CartLine } from '../lib/cart'
import { loadProduct } from '../lib/catalog'
import { buildOrderMessage, makeOrderNumber, type Buyer } from '../lib/order'
import { formatRupiah, whatsappLink } from '../lib/shop'

const BUYER_KEY = 'vg-buyer-v1'

function loadBuyer(): Buyer {
  try {
    return { name: '', address: '', note: '', ...JSON.parse(localStorage.getItem(BUYER_KEY) ?? '{}') }
  } catch {
    return { name: '', address: '', note: '' }
  }
}

export default function CartPage() {
  const { lines, count, total, setQty, remove, clear } = useCart()
  const [buyer, setBuyer] = useState<Buyer>(loadBuyer)
  const [sentOrder, setSentOrder] = useState<string | null>(null)
  const { unavailable, priceChanged } = useCartCheck()

  // Sold-out/removed products must be taken out first, so the WhatsApp order only lists things that can be bought
  const hasUnavailable = lines.some((l) => unavailable.has(l.key))
  const canOrder = lines.length > 0 && !hasUnavailable

  function updateBuyer(field: keyof Buyer, value: string) {
    const next = { ...buyer, [field]: value }
    setBuyer(next)
    try {
      localStorage.setItem(BUYER_KEY, JSON.stringify(next)) // remembered for the next order
    } catch {
      // storage blocked: fine, the form still works
    }
  }

  function checkout(e: FormEvent) {
    e.preventDefault()
    if (!canOrder) return
    const orderNumber = makeOrderNumber()
    window.open(whatsappLink(buildOrderMessage(lines, buyer, orderNumber)), '_blank', 'noopener')
    setSentOrder(orderNumber)
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-brand-yellow/40 text-brand-pink">
          <ShoppingBag className="size-10" />
        </span>
        <h1 className="text-xl font-bold">Keranjang masih kosong</h1>
        <p className="text-gray-600">Yuk pilih produk dulu, lalu pesan lewat WhatsApp.</p>
        <Link to="/produk" className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">Mulai belanja</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <h1 className="mb-4 text-xl font-bold md:text-2xl">
        Keranjang <span className="text-base font-normal text-gray-500">({count} barang)</span>
      </h1>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        <section className="space-y-3">
          {priceChanged && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Ada harga yang berubah sejak ditambahkan. Harga di bawah sudah yang terbaru.
            </p>
          )}
          <ul className="space-y-3">
            {lines.map((line) => (
              <CartRow key={line.key} line={line} unavailable={unavailable.has(line.key)} onQty={(n) => setQty(line.key, n)} onRemove={() => remove(line.key)} />
            ))}
          </ul>
          <button onClick={() => window.confirm('Kosongkan semua isi keranjang?') && clear()} className="text-sm font-semibold text-gray-500 hover:text-brand-pink">
            Kosongkan keranjang
          </button>
        </section>

        <form onSubmit={checkout} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 md:p-5 lg:sticky lg:top-36">
          <div className="space-y-1 border-b border-dashed border-gray-200 pb-4">
            <div className="flex items-end justify-between">
              <span className="font-bold">Total <span className="text-sm font-normal text-gray-500">({count} barang)</span></span>
              <span className="text-2xl font-extrabold text-brand-pink">{formatRupiah(total)}</span>
            </div>
            <p className="text-right text-xs text-gray-500">Belum termasuk ongkir</p>
          </div>

          <Field label="Nama" required>
            <input value={buyer.name} onChange={(e) => updateBuyer('name', e.target.value)} required maxLength={60} autoComplete="name" placeholder="Nama kamu" className={INPUT} />
          </Field>
          <Field label="Alamat pengiriman" hint="opsional">
            <textarea value={buyer.address} onChange={(e) => updateBuyer('address', e.target.value)} rows={2} maxLength={300} autoComplete="street-address" placeholder="Kosongkan kalau ambil di toko" className={INPUT} />
          </Field>
          <Field label="Catatan" hint="opsional">
            <textarea value={buyer.note} onChange={(e) => updateBuyer('note', e.target.value)} rows={2} maxLength={300} placeholder="Contoh: kirim pakai kurir toko" className={INPUT} />
          </Field>

          {hasUnavailable && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">Hapus dulu produk yang sudah tidak tersedia.</p>
          )}
          <button
            type="submit"
            disabled={!canOrder}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <WhatsAppIcon className="size-5" /> Pesan via WhatsApp
          </button>
          <p className="text-center text-xs text-gray-500">WhatsApp akan terbuka dengan pesanan kamu. Tinggal tekan kirim.</p>
        </form>
      </div>

      {sentOrder && (
        <SentDialog
          orderNumber={sentOrder}
          onDone={() => {
            clear()
            setSentOrder(null)
          }}
          onBack={() => setSentOrder(null)}
        />
      )}
    </div>
  )
}

const INPUT = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/15'

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">
        {label} {required && <span className="text-brand-pink">*</span>}
        {hint && <span className="font-normal text-gray-400"> ({hint})</span>}
      </span>
      {children}
    </label>
  )
}

function CartRow({ line, unavailable, onQty, onRemove }: { line: CartLine; unavailable: boolean; onQty: (n: number) => void; onRemove: () => void }) {
  return (
    <li className={`flex gap-3 rounded-xl bg-white p-3 ring-1 ${unavailable ? 'ring-red-200' : 'ring-gray-100'}`}>
      <Link to={`/produk/${line.productId}`} className="size-20 shrink-0 overflow-hidden rounded-lg bg-brand-yellow/10 md:size-24">
        {line.image && <img src={line.image} alt="" loading="lazy" className={`size-full object-cover ${unavailable ? 'opacity-40 grayscale' : ''}`} />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/produk/${line.productId}`} className="line-clamp-2 text-sm font-medium hover:text-brand-pink">{line.name}</Link>
          <button onClick={onRemove} aria-label={`Hapus ${line.name}`} className="-m-1 shrink-0 p-1 text-gray-400 hover:text-red-600">
            <Trash2 className="size-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {line.variantName && <span>Variasi: <span className="font-semibold text-gray-700">{line.variantName}</span></span>}
          {line.variantName && line.sku && ' · '}
          {line.sku && <span>Kode: {line.sku}</span>}
        </p>
        {unavailable ? (
          <p className="text-sm font-semibold text-red-700">Sudah tidak tersedia</p>
        ) : (
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
            <QtyStepper small value={line.qty} onChange={onQty} />
            <div className="text-right">
              <p className="text-xs text-gray-500">{formatRupiah(line.price)} / pcs</p>
              <p className="font-bold text-brand-pink">{formatRupiah(line.price * line.qty)}</p>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

function SentDialog({ orderNumber, onDone, onBack }: { orderNumber: string; onDone: () => void; onBack: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sent-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#25d366]/15 text-[#128c4a]">
          <WhatsAppIcon className="size-7" />
        </span>
        <h2 id="sent-title" className="text-lg font-bold">Sudah dikirim di WhatsApp?</h2>
        <p className="text-sm text-gray-600">
          No. pesanan kamu: <span className="font-mono font-bold text-ink">{orderNumber}</span>
          <br />Admin akan membalas dengan total ongkir dan cara bayar.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onDone} className="rounded-full bg-brand-pink px-5 py-2.5 font-semibold text-white">Sudah, kosongkan keranjang</button>
          <button onClick={onBack} className="rounded-full px-5 py-2.5 font-semibold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Belum, kembali ke keranjang</button>
        </div>
      </div>
    </div>
  )
}

/**
 * Checks the cart against the current catalog once when the page opens:
 * updates prices the admin changed, and flags products/variants that no longer exist or are sold out.
 */
function useCartCheck() {
  const { lines, update } = useCart()
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set())
  const [priceChanged, setPriceChanged] = useState(false)

  useEffect(() => {
    let alive = true
    const ids = [...new Set(lines.map((l) => l.productId))]
    Promise.all(ids.map((id) => loadProduct(id).catch(() => undefined))).then((products) => {
      if (!alive) return
      const gone = new Set<string>()
      let changed = false
      for (const line of lines) {
        const product = products[ids.indexOf(line.productId)]
        if (product === undefined) continue // network error: keep the line as it is
        const variant = line.variantId ? product?.variants.find((v) => v.id === line.variantId) : null
        const current = line.variantId ? variant : product
        if (!product || !current || !current.inStock) {
          gone.add(line.key)
        } else if (current.price !== line.price) {
          update(line.key, { price: current.price })
          changed = true
        }
      }
      setUnavailable(gone)
      setPriceChanged(changed)
    })
    return () => {
      alive = false
    }
    // Only when the page opens: changing a quantity shouldn't re-check everything
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { unavailable, priceChanged }
}
