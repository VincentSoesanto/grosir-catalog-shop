// Halaman produk (/produk/1005): photos, price, code, variant choice, quantity, + Keranjang, description,
// buyer testimonials (WhatsApp screenshots), similar products.
import { Check, ChevronRight, PackageX, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { WhatsAppIcon } from '../components/BrandIcons'
import Description from '../components/Description'
import ProductGallery from '../components/ProductGallery'
import ProductGrid from '../components/ProductGrid'
import ProductReviews from '../components/ProductReviews'
import QtyStepper from '../components/QtyStepper'
import { useCart } from '../lib/cart'
import { loadProduct, useCatalog } from '../lib/catalog'
import { allPhotos, variantPhoto } from '../lib/photos'
import { loadTestimonials } from '../lib/reviews'
import { useAddedToCartToast } from '../lib/toast'
import { useCooldown } from '../lib/useCooldown'
import { formatRupiah, SHOP, whatsappLink } from '../lib/shop'
import type { ProductDetail, ProductSummary, Variant } from '../types/product'
import type { Testimonial } from '../types/review'

export default function ProductPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<{ id: string; product: ProductDetail | null; error?: boolean } | null>(null)

  useEffect(() => {
    let alive = true
    loadProduct(id).then(
      (product) => alive && setState({ id, product }),
      () => alive && setState({ id, product: null, error: true }),
    )
    return () => {
      alive = false
    }
  }, [id])

  if (!state || state.id !== id) return <ProductSkeleton />
  if (state.error) return <Message text="Produk gagal dimuat. Periksa internet lalu muat ulang halaman." />
  if (!state.product) return <Message text="Produk tidak ditemukan." />
  // key: a new product starts with fresh choices (variant, quantity, photo)
  return <ProductView key={id} product={state.product} />
}

function ProductView({ product }: { product: ProductDetail }) {
  const { add } = useCart()
  const { catalog } = useCatalog()
  const hasVariants = product.variants.length > 0
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null)
  const [qty, setQty] = useState(1)
  const [photo, setPhoto] = useState(0)
  const [needVariant, setNeedVariant] = useState(false)
  const showAdded = useAddedToCartToast()
  const cooldown = useCooldown()
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null)

  useEffect(() => {
    let alive = true
    loadTestimonials(product.id).then((t) => alive && setTestimonials(t))
    return () => {
      alive = false
    }
  }, [product.id])

  // Photos: the product's own photos, then old variant photos (so choosing a variant can show its picture)
  const photos = allPhotos(product)

  useEffect(() => {
    document.title = `${product.name} | ${SHOP.name}`
    return () => {
      document.title = SHOP.name
    }
  }, [product.name])

  const prices = product.variants.map((v) => v.price)
  const minPrice = hasVariants ? Math.min(...prices) : product.price
  const maxPrice = hasVariants ? Math.max(...prices) : product.price
  const price = variant?.price ?? minPrice
  const code = variant ? variant.sku : product.sku
  const inStock = hasVariants ? (variant ? variant.inStock : product.variants.some((v) => v.inStock)) : product.inStock
  const category = catalog?.categories.find((c) => c.slug === product.categories[0])

  function chooseVariant(v: Variant) {
    setVariant(v)
    setNeedVariant(false)
    const src = variantPhoto(product, v)
    if (src) setPhoto(photos.indexOf(src))
  }

  function addToCart() {
    if (cooldown.busy) return
    if (hasVariants && !variant) {
      setNeedVariant(true)
      document.getElementById('variant-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    cooldown.run(() => {
      add(
        {
          productId: product.id,
          variantId: variant?.id ?? null,
          name: product.name,
          variantName: variant?.name ?? null,
          sku: code,
          price,
          // the cart keeps a small picture: photos uploaded in admin are too big to store in the cart
          image: (variant && variantPhoto(product, variant)?.replace(/^data:.*/, '')) || product.image,
        },
        qty,
      )
      showAdded()
    })
  }

  const askMessage = `Halo ${SHOP.name}, saya mau tanya produk ini:\n${product.name}${variant ? ` (${variant.name})` : ''}${code ? `\nKode: ${code}` : ''}\n${window.location.href}`
  // No testimonials yet: show more products instead, so the page doesn't end empty
  const hasTestimonials = !!testimonials && testimonials.length > 0
  const similar = pickSimilar(catalog?.products ?? [], product, hasTestimonials ? 6 : 12)

  const addButton = (
    <button
      onClick={addToCart}
      disabled={!inStock || cooldown.busy}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 font-bold shadow-sm ring-1 ring-black/5 transition disabled:cursor-not-allowed ${
        cooldown.busy ? 'bg-green-500 text-white' : 'bg-brand-yellow text-brand-pink-dark hover:brightness-105 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-500'
      }`}
    >
      {cooldown.busy ? <Check className="size-5" /> : <ShoppingCart className="size-5" />}
      {cooldown.busy ? 'Ditambahkan' : inStock ? '+ Keranjang' : 'Stok habis'}
    </button>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-gray-500" aria-label="Lokasi halaman">
        <Link to="/" className="hover:text-brand-pink">Beranda</Link>
        <ChevronRight className="size-3" />
        {category ? <Link to={`/kategori/${category.slug}`} className="hover:text-brand-pink">{category.name}</Link> : <Link to="/produk" className="hover:text-brand-pink">Produk</Link>}
        <ChevronRight className="size-3" />
        <span className="line-clamp-1 text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery images={photos} active={photo} onSelect={setPhoto} alt={product.name} dimmed={!inStock} />

        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-xl font-bold leading-snug md:text-2xl">{product.name}</h1>
            <p className="text-2xl font-extrabold text-brand-pink md:text-3xl">
              {variant || minPrice === maxPrice ? formatRupiah(price) : `${formatRupiah(minPrice)} – ${formatRupiah(maxPrice)}`}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {code && <span className="text-gray-500">Kode: <span className="font-mono font-semibold text-gray-800">{code}</span></span>}
              {inStock ? (
                <span className="flex items-center gap-1 font-semibold text-green-700"><Check className="size-4" /> Tersedia</span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-gray-500"><PackageX className="size-4" /> Habis</span>
              )}
            </div>
          </div>

          {hasVariants && (
            <fieldset id="variant-picker" className={`rounded-xl p-3 transition ${needVariant ? 'bg-brand-pink/5 ring-2 ring-brand-pink' : 'bg-white ring-1 ring-gray-100'}`}>
              <legend className="sr-only">{product.variantLabel}</legend>
              <p className="mb-2 text-sm font-semibold">
                {product.variantLabel}: <span className="text-brand-pink">{variant?.name ?? '—'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const selected = v.id === variant?.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => chooseVariant(v)}
                      disabled={!v.inStock}
                      aria-pressed={selected}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition ${
                        selected ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' : 'border-gray-200 bg-white hover:border-brand-yellow'
                      } disabled:cursor-not-allowed disabled:border-dashed disabled:text-gray-400 disabled:line-through`}
                    >
                      {variantPhoto(product, v) && <img src={variantPhoto(product, v)!} alt="" loading="lazy" width="24" height="24" className="size-6 rounded object-cover" />}
                      {v.name}
                    </button>
                  )
                })}
              </div>
              {needVariant && <p className="mt-2 text-sm font-semibold text-brand-pink">Pilih {product.variantLabel.toLowerCase()} dulu ya.</p>}
            </fieldset>
          )}

          {/* Desktop/tablet: quantity + buttons here. Phone: in the bar fixed at the bottom. */}
          <div className="hidden items-center gap-3 md:flex">
            <QtyStepper value={qty} onChange={setQty} />
            {addButton}
          </div>

          <a
            href={whatsappLink(askMessage)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border-2 border-[#25d366] px-5 py-2.5 text-sm font-semibold text-[#128c4a] transition hover:bg-[#25d366]/10"
          >
            <WhatsAppIcon className="size-5" /> Tanya produk ini via WhatsApp
          </a>

          {product.description && <Description text={product.description} />}
        </div>
      </div>

      {hasTestimonials && <ProductReviews testimonials={testimonials} />}

      {testimonials && similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold md:text-xl">{hasTestimonials ? 'Produk Serupa' : 'Produk Lainnya'}</h2>
          <ProductGrid products={similar} />
        </section>
      )}

      {/* Phone: fixed action bar at the bottom (the bottom menu is hidden on this page) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:hidden">
        <QtyStepper small value={qty} onChange={setQty} />
        {addButton}
      </div>
    </div>
  )
}

/** Products from the same category first; topped up with other products when the category is small */
function pickSimilar(all: ProductSummary[], product: ProductDetail, count: number) {
  const usable = all.filter((p) => p.id !== product.id && p.inStock && p.image)
  const same = usable.filter((p) => p.categories.includes(product.categories[0]))
  const others = usable.filter((p) => !same.includes(p))
  return [...same, ...others].slice(0, count)
}

function Message({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-gray-600">{text}</p>
      <Link to="/produk" className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">Lihat semua produk</Link>
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-2 md:gap-10" aria-hidden="true">
      <div className="aspect-square animate-pulse rounded-2xl bg-brand-yellow/15" />
      <div className="space-y-4">
        <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-brand-pink/20" />
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}
