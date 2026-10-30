// One product in a grid: photo, name, price and an add-to-cart button. Nothing else, so the grid stays tidy.
// Products with variants (colour etc.) show "Pilih" and open the product page, where the customer chooses one.
import { Check, ImageOff, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { formatRupiah } from '../lib/shop'
import { useAddedToCartToast } from '../lib/toast'
import { useCooldown } from '../lib/useCooldown'
import type { ProductSummary } from '../types/product'

export default function ProductCard({ product }: { product: ProductSummary }) {
  const { add } = useCart()
  const showAdded = useAddedToCartToast()
  const cooldown = useCooldown()
  const url = `/produk/${product.id}`

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-yellow">
      <Link to={url} className="relative block aspect-square overflow-hidden bg-brand-yellow/10">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width="480"
            height="480"
            className={`size-full object-cover transition duration-300 group-hover:scale-105 ${product.inStock ? '' : 'opacity-50 grayscale'}`}
          />
        ) : (
          <span className="grid size-full place-items-center text-brand-pink/40">
            <ImageOff className="size-10" aria-label="Belum ada foto" />
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ink/75 py-1 text-center text-xs font-bold tracking-wide text-white">HABIS</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 md:p-3">
        <Link to={url} className="line-clamp-2 min-h-10 text-[13px] leading-5 text-gray-800 hover:text-brand-pink md:text-sm">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-1 pt-2">
          <p className="font-bold text-brand-pink">
            {product.fromPrice && <span className="block text-[10px] font-normal text-gray-500">mulai</span>}
            {formatRupiah(product.price)}
          </p>
          {!product.inStock ? null : product.hasVariants ? (
            <Link to={url} className="shrink-0 rounded-full border border-brand-pink px-2.5 py-1 text-[11px] font-semibold text-brand-pink hover:bg-brand-pink hover:text-white">
              Pilih
            </Link>
          ) : (
            <button
              onClick={() =>
                cooldown.run(() => {
                  add({ productId: product.id, variantId: null, name: product.name, variantName: null, sku: product.sku, price: product.price, image: product.image })
                  showAdded()
                })
              }
              disabled={cooldown.busy}
              aria-label={cooldown.busy ? 'Sudah ditambahkan' : `Tambah ${product.name} ke keranjang`}
              className={`grid size-8 shrink-0 place-items-center rounded-full shadow-sm ring-1 ring-black/5 transition ${
                cooldown.busy ? 'bg-green-500 text-white' : 'bg-brand-yellow text-brand-pink-dark hover:scale-110 active:scale-95'
              }`}
            >
              {cooldown.busy ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
