// The product grid used on every list page. Phone: 2 per row, tablet 3–4, desktop up to 6.
import type { ProductSummary } from '../types/product'
import ProductCard from './ProductCard'

const GRID = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4'

export default function ProductGrid({ products, wide = true }: { products: ProductSummary[]; wide?: boolean }) {
  return (
    <div className={`${GRID} ${wide ? 'lg:grid-cols-6' : 'lg:grid-cols-4 xl:grid-cols-5'}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

/** Grey placeholder cards shown while products load */
export function ProductGridSkeleton({ count = 12, wide = true }: { count?: number; wide?: boolean }) {
  return (
    <div className={`${GRID} ${wide ? 'lg:grid-cols-6' : 'lg:grid-cols-4 xl:grid-cols-5'}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
          <div className="aspect-square animate-pulse bg-brand-yellow/15" />
          <div className="space-y-2 p-3">
            <div className="h-3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-brand-pink/20" />
          </div>
        </div>
      ))}
    </div>
  )
}
