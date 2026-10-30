// Where pages get products from.
// - Firestore (the admin can change it): catalog/meta + catalog/list-0, list-1 ... (all product summaries in a
//   few documents, so one visit costs ~2 reads) and products/<id> (one product page).
// - Until the data is imported into Firestore (or when no Firebase project is set: demo mode), the files in
//   public/data are used instead (made by scripts/make-demo-data.mjs).
// Pages only use this file, so they don't care where the data comes from.
import { doc, getDoc } from 'firebase/firestore/lite'
import { useEffect, useState } from 'react'
import type { Catalog, Category, ProductDetail, ProductSection, ProductSummary } from '../types/product'
import { db, firebaseConfigured } from './firebase'

export interface CatalogMeta {
  categories: Category[]
  /** how many catalog/list-N documents there are */
  lists: number
  updatedAt: string
  /** price updates (public/data/updates) already applied by the admin */
  appliedUpdates?: string[]
}

interface LoadedCatalog extends Catalog {
  source: 'firestore' | 'files'
  appliedUpdates: string[]
}

/** Everything, including products the admin hid (the admin page needs those) */
export async function loadFullCatalog(): Promise<LoadedCatalog> {
  const meta = !firebaseConfigured ? null : await getDoc(doc(db, 'catalog', 'meta')).catch((e: { code?: string }) => {
    // Rules not published yet: the database is still locked, so use the files
    if (e.code === 'permission-denied') return null
    throw e
  })
  if (!meta?.exists()) {
    const r = await fetch('/data/catalog.json')
    if (!r.ok) throw new Error(`catalog ${r.status}`)
    return { ...((await r.json()) as Catalog), source: 'files', appliedUpdates: [] }
  }
  const { categories, lists, appliedUpdates = [] } = meta.data() as CatalogMeta
  const parts = await Promise.all(Array.from({ length: lists }, (_, i) => getDoc(doc(db, 'catalog', `list-${i}`))))
  const products = parts.flatMap((p) => (p.data()?.products ?? []) as ProductSummary[])
  return { categories, products, source: 'firestore', appliedUpdates }
}

let cache: Promise<LoadedCatalog> | null = null

/** What customers see: hidden products and empty categories left out. Loaded once per visit. */
export function loadCatalog(): Promise<LoadedCatalog> {
  if (!cache) {
    cache = loadFullCatalog().then((c) => {
      const products = c.products.filter((p) => !p.hidden)
      const categories = c.categories.filter((cat) => products.some((p) => p.categories.includes(cat.slug)))
      return { ...c, products, categories }
    })
    cache.catch(() => (cache = null)) // allow a retry after a network error
  }
  return cache
}

/** After the admin saves, customers' pages in the same browser should see the change */
export function forgetCatalog() {
  cache = null
}

/** React hook: the catalog, or null while loading. `error` is true if it couldn't load. */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    loadCatalog().then(
      (c) => alive && setCatalog(c),
      () => alive && setError(true),
    )
    return () => {
      alive = false
    }
  }, [])
  return { catalog, error }
}

/** One product's details, or null if it doesn't exist. `includeHidden` is for the admin page. */
export async function loadProduct(id: string, includeHidden = false): Promise<ProductDetail | null> {
  if (!/^[\w-]+$/.test(id)) return null
  const { source } = await loadCatalog()
  let product: ProductDetail | null = null
  if (source === 'firestore') {
    const snap = await getDoc(doc(db, 'products', id))
    product = snap.exists() ? (snap.data() as ProductDetail) : null
  } else {
    const r = await fetch(`/data/products/${id}.json`)
    // An unknown id returns the site's index.html (SPA fallback), not JSON
    if (r.ok && r.headers.get('content-type')?.includes('json')) product = (await r.json()) as ProductDetail
  }
  if (product?.hidden && !includeHidden) return null
  return product
}

const byInStockWithPhoto = (p: ProductSummary) => p.inStock && p.image !== null

/** The product rows on the home page, as set in "Tampilan Toko" (category "" = newest products) */
export function homeSections(catalog: Catalog, rows: { title: string; category: string }[]): ProductSection[] {
  const shown = catalog.products.filter(byInStockWithPhoto)
  const used = new Set<string>() // a product appears in one row only
  return rows.map((row) => {
    const items = shown.filter((p) => !used.has(p.id) && (!row.category || p.categories.includes(row.category))).slice(0, 12)
    items.forEach((p) => used.add(p.id))
    return { title: row.title, categorySlug: row.category || undefined, items }
  })
}

export type SortKey = 'terbaru' | 'termurah' | 'termahal' | 'nama'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'terbaru', label: 'Terbaru' },
  { key: 'termurah', label: 'Harga terendah' },
  { key: 'termahal', label: 'Harga tertinggi' },
  { key: 'nama', label: 'Nama A–Z' },
]

/** Filter + sort for the shop page. Search matches every typed word in the name or product code. */
export function findProducts(products: ProductSummary[], opts: { category?: string; query?: string; sort: SortKey }) {
  const words = (opts.query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const result = products.filter((p) => {
    if (opts.category && !p.categories.includes(opts.category)) return false
    const text = `${p.name} ${p.sku}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })

  // The catalog is already newest-first; the other sorts copy it. Sold-out products always go last.
  const sorted = [...result]
  if (opts.sort === 'termurah') sorted.sort((a, b) => a.price - b.price)
  if (opts.sort === 'termahal') sorted.sort((a, b) => b.price - a.price)
  if (opts.sort === 'nama') sorted.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  return sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock))
}
