// What a product looks like in a list (home page, shop page).
// Variants are NOT part of this on purpose: they're only shown on the product page, so the grid stays clean.
export interface ProductSummary {
  id: string
  /** product code; empty when the product has variants (each variant has its own code) */
  sku: string
  name: string
  price: number
  /** true when variants have different prices: show "mulai Rp..." */
  fromPrice: boolean
  hasVariants: boolean
  /** category slugs */
  categories: string[]
  image: string | null
  inStock: boolean
  /** hidden by the admin: not shown to customers */
  hidden?: boolean
}

export interface Category {
  name: string
  slug: string
  count: number
  image: string | null
}

export interface ProductSection {
  title: string
  categorySlug?: string
  items: ProductSummary[]
}

export interface Catalog {
  categories: Category[]
  products: ProductSummary[]
}

/** One choice of a product with variants (colour, motif, size...). Each has its own price, code and stock. */
export interface Variant {
  id: string
  name: string
  sku: string
  price: number
  inStock: boolean
  image: string | null
}

/** Everything the product page needs */
export interface ProductDetail extends ProductSummary {
  images: string[]
  /** what the choice is called, e.g. "Variasi" */
  variantLabel: string
  variants: Variant[]
  description: string
}
