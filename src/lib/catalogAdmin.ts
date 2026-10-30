// Admin-only database actions: save a product, import the catalog files once, manage testimonials.
// Firestore rules only allow these for the admin account (see firestore.rules).
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where, writeBatch, type WriteBatch } from 'firebase/firestore/lite'
import type { Catalog, Category, ProductDetail, ProductSummary } from '../types/product'
import { forgetCatalog, loadFullCatalog, type CatalogMeta } from './catalog'
import { db } from './firebase'
import { shrinkImage } from './image'
import { photoRef } from './photos'
import type { StoreSettings } from './storeSettings'

// A Firestore document can hold 1 MB; stay well below it per product list document
const LIST_LIMIT_BYTES = 700_000
// A batch can hold 500 writes
const BATCH_SIZE = 400

/** Firestore refuses `undefined` values: remove them */
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** The short version of a product that the lists (home, shop) use */
export function summarize(p: ProductDetail): ProductSummary {
  const variants = p.variants
  const prices = variants.map((v) => v.price)
  return {
    id: p.id,
    sku: variants.length ? '' : p.sku,
    name: p.name,
    price: variants.length ? Math.min(...prices) : p.price,
    fromPrice: new Set(prices).size > 1,
    hasVariants: variants.length > 0,
    categories: p.categories,
    image: p.image,
    inStock: variants.length ? variants.some((v) => v.inStock) : p.inStock,
    ...(p.hidden ? { hidden: true } : {}),
  }
}

function countCategories(categories: Category[], products: ProductSummary[]): Category[] {
  const visible = products.filter((p) => !p.hidden)
  return categories.map((c) => ({ ...c, count: visible.filter((p) => p.categories.includes(c.slug)).length }))
}

/** Splits the product summaries over as few documents as possible, each under the size limit */
function splitLists(products: ProductSummary[]): ProductSummary[][] {
  const lists: ProductSummary[][] = [[]]
  let size = 0
  for (const p of products) {
    const bytes = JSON.stringify(p).length * 1.2 // a little extra for multi-byte characters
    if (size + bytes > LIST_LIMIT_BYTES && lists[lists.length - 1].length > 0) {
      lists.push([])
      size = 0
    }
    lists[lists.length - 1].push(p)
    size += bytes
  }
  return lists
}

function writeCatalog(batch: WriteBatch, catalog: Catalog, appliedUpdates: string[] = []) {
  const lists = splitLists(catalog.products)
  lists.forEach((products, i) => batch.set(doc(db, 'catalog', `list-${i}`), clean({ products })))
  const meta: CatalogMeta = {
    categories: countCategories(catalog.categories, catalog.products),
    lists: lists.length,
    updatedAt: new Date().toISOString(),
    appliedUpdates,
  }
  batch.set(doc(db, 'catalog', 'meta'), clean(meta))
}

/** Saves one product (its page + its line in the product list) in one go */
export async function saveProduct(product: ProductDetail) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const summary = summarize(product)
  const exists = catalog.products.some((p) => p.id === product.id)
  const products = exists ? catalog.products.map((p) => (p.id === product.id ? summary : p)) : [summary, ...catalog.products]

  const batch = writeBatch(db)
  batch.set(doc(db, 'products', product.id), clean({ ...product, ...summary, sku: product.sku, updatedAt: new Date().toISOString() }))
  writeCatalog(batch, { categories: catalog.categories, products }, catalog.appliedUpdates)
  await batch.commit()
  forgetCatalog()
}

/** Deletes a product for good: its page, its line in the product lists and its testimonials */
export async function deleteProduct(productId: string) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const testimonials = await getDocs(query(collection(db, 'testimonials'), where('productId', '==', productId)))
  const batch = writeBatch(db)
  batch.delete(doc(db, 'products', productId))
  testimonials.docs.forEach((t) => batch.delete(t.ref))
  writeCatalog(batch, { categories: catalog.categories, products: catalog.products.filter((p) => p.id !== productId) }, catalog.appliedUpdates)
  await batch.commit()
  forgetCatalog()
}

/** Is this id still free for a new product? */
export async function productIdFree(id: string) {
  return !(await getDoc(doc(db, 'products', id))).exists()
}

/**
 * One time: copies the catalog files (public/data/*.json, e.g. made by scripts/make-demo-data.mjs) into Firestore.
 * One write per product: a catalog of ~1,400 products stays well inside the free 20,000 writes per day.
 */
export async function importFromFiles(onProgress: (done: number, total: number) => void) {
  const catalog = (await (await fetch('/data/catalog.json')).json()) as Catalog
  const total = catalog.products.length
  let done = 0

  for (let start = 0; start < total; start += BATCH_SIZE) {
    const slice = catalog.products.slice(start, start + BATCH_SIZE)
    const details = await Promise.all(
      slice.map(async (p) => {
        const r = await fetch(`/data/products/${p.id}.json`)
        if (!r.ok) throw new Error(`Produk ${p.id} tidak bisa dibaca`)
        return (await r.json()) as ProductDetail
      }),
    )
    const batch = writeBatch(db)
    for (const d of details) batch.set(doc(db, 'products', d.id), clean({ ...d, updatedAt: new Date().toISOString() }))
    await batch.commit()
    done += slice.length
    onProgress(done, total)
  }

  // The lists + categories last: from then on the website reads from Firestore
  const batch = writeBatch(db)
  writeCatalog(batch, catalog)
  await batch.commit()
  forgetCatalog()
}

export async function addTestimonial(productId: string, file: File, caption: string) {
  const image = await shrinkImage(file)
  await addDoc(collection(db, 'testimonials'), clean({
    productId,
    image,
    caption: caption.trim() || undefined,
    date: new Date().toISOString().slice(0, 10),
  }))
}

export async function deleteTestimonial(id: string) {
  await deleteDoc(doc(db, 'testimonials', id))
}

/** A price/name update prepared from the shop's product photos (public/data/updates/<id>.json) */
export interface PriceUpdate {
  id: string
  title: string
  date: string
  /** category that new products go into */
  newCategory: { name: string; slug: string }
  changes: {
    productId: string
    kode: string
    /** shown as "Nama - KODE" */
    name: string
    /** missing = keep the current price */
    price?: number
    isNew?: boolean
    image?: string
    images?: string[]
  }[]
}

/**
 * Applies an update: existing products get the new name and kode (and price, when the update has one);
 * photo, description and categories stay. New products are added with their photo in update.newCategory.
 * Big updates are saved in parts (a Firestore batch holds 500 writes); the product lists are saved last,
 * so the shop only shows the change once every product is saved.
 */
export async function applyPriceUpdate(update: PriceUpdate, onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')

  const hasNew = update.changes.some((c) => c.isNew)
  const categories = !hasNew || catalog.categories.some((c) => c.slug === update.newCategory.slug)
    ? catalog.categories
    : [...catalog.categories, { ...update.newCategory, count: 0, image: update.changes.find((c) => c.isNew)?.image ?? null }]
  const summaries = new Map(catalog.products.map((p) => [p.id, p]))
  const now = new Date().toISOString()

  async function build(change: PriceUpdate['changes'][number]): Promise<ProductDetail> {
    if (change.isNew) {
      return {
        id: change.productId,
        sku: change.kode,
        name: change.name,
        price: change.price ?? 0,
        fromPrice: false,
        hasVariants: false,
        categories: [update.newCategory.slug],
        image: change.image ?? null,
        inStock: true,
        images: change.images ?? [],
        variantLabel: 'Variasi',
        variants: [],
        description: '',
      }
    }
    const snap = await getDoc(doc(db, 'products', change.productId))
    if (!snap.exists()) throw new Error(`Produk ${change.kode} tidak ditemukan`)
    const current = snap.data() as ProductDetail
    return { ...current, name: change.name, sku: change.kode, price: change.price ?? current.price }
  }

  for (let start = 0; start < update.changes.length; start += BATCH_SIZE) {
    const part = await Promise.all(update.changes.slice(start, start + BATCH_SIZE).map(build))
    const batch = writeBatch(db)
    for (const product of part) {
      const summary = summarize(product)
      summaries.set(product.id, summary)
      batch.set(doc(db, 'products', product.id), clean({ ...product, ...summary, sku: product.sku, updatedAt: now }))
    }
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, update.changes.length), update.changes.length)
  }

  // New products first in the lists (newest-first order), the rest keep their place
  const newIds = new Set(update.changes.filter((c) => c.isNew).map((c) => c.productId))
  const products = [
    ...[...newIds].map((id) => summaries.get(id)!),
    ...catalog.products.filter((p) => !newIds.has(p.id)).map((p) => summaries.get(p.id)!),
  ]
  const batch = writeBatch(db)
  writeCatalog(batch, { categories, products }, [...catalog.appliedUpdates, update.id])
  await batch.commit()
  forgetCatalog()
}

/** A fix for variant photos (public/data/updates/<id>.json with kind "variantPhotos") */
export interface VariantPhotoFix {
  id: string
  kind: 'variantPhotos'
  title: string
  date: string
  changes: {
    productId: string
    name: string
    /** image: one of the product's own photos, or null = "Tanpa foto" */
    variants: { id: string; name: string; old: string; image: string | null }[]
  }[]
}

/** Points each listed variant at the chosen photo of its product (or none). Only the variant photos change. */
export async function applyVariantPhotoFix(fix: VariantPhotoFix, onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const now = new Date().toISOString()

  for (let start = 0; start < fix.changes.length; start += BATCH_SIZE) {
    const part = fix.changes.slice(start, start + BATCH_SIZE)
    const snaps = await Promise.all(part.map((c) => getDoc(doc(db, 'products', c.productId))))
    const batch = writeBatch(db)
    part.forEach((change, i) => {
      if (!snaps[i].exists()) return // product deleted meanwhile: nothing to fix
      const product = snaps[i].data() as ProductDetail
      const variants = product.variants.map((v) => {
        const fixed = change.variants.find((f) => f.id === v.id)
        if (!fixed) return v
        // the photo may have moved or been deleted in admin since the fix was made: then no photo
        const index = fixed.image ? product.images.indexOf(fixed.image) : -1
        return { ...v, image: index >= 0 ? photoRef(index) : null }
      })
      batch.set(doc(db, 'products', product.id), clean({ ...product, variants, updatedAt: now }))
    })
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, fix.changes.length), fix.changes.length)
  }

  // Remember that this fix was applied (the product lists themselves don't change)
  const batch = writeBatch(db)
  writeCatalog(batch, catalog, [...catalog.appliedUpdates, fix.id])
  await batch.commit()
  forgetCatalog()
}

/** A full new catalog prepared from the shop's photo folders (public/data/updates/<id>.json, kind "catalog") */
export interface CatalogUpdate {
  id: string
  kind: 'catalog'
  title: string
  date: string
  newCategory: { name: string; slug: string }
  /** website products that have a new photo: new name/kode/price and ONLY the new photo */
  matched: { productId: string; kode: string; name: string; price: number; image: string; images: string[]; oldName: string; oldPrice: number }[]
  /** products that are not on the website yet */
  new: ProductDetail[]
  /** photos that were left out (no price, kode twice) */
  skipped: { n: number; why: string; file: string }[]
}

/**
 * Applies the catalog: matched products are updated, new products added, and every other product is hidden
 * (no new photo = not sold any more). Uses updates without reading each product first, to stay well inside
 * the free daily limits. The product lists are written last.
 */
export async function applyCatalogUpdate(update: CatalogUpdate, onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const now = new Date().toISOString()
  const matched = new Map(update.matched.map((m) => [m.productId, m]))
  const newIds = new Set(update.new.map((p) => p.id))

  type Job = (batch: WriteBatch) => void
  const jobs: Job[] = []
  const summaries = new Map<string, ProductSummary>()

  for (const p of update.new) {
    const summary = summarize(p)
    summaries.set(p.id, summary)
    jobs.push((b) => b.set(doc(db, 'products', p.id), clean({ ...p, ...summary, sku: p.sku, updatedAt: now })))
  }
  for (const old of catalog.products) {
    if (newIds.has(old.id)) continue
    const m = matched.get(old.id)
    if (m) {
      const summary: ProductSummary = { ...old, name: m.name, sku: m.kode, price: m.price, fromPrice: false, image: m.image, inStock: true }
      delete summary.hidden
      summaries.set(old.id, summary)
      jobs.push((b) =>
        b.update(doc(db, 'products', old.id), {
          name: m.name, sku: m.kode, price: m.price, fromPrice: false, image: m.image, images: m.images,
          inStock: true, hidden: false, updatedAt: now,
        }),
      )
    } else {
      summaries.set(old.id, { ...old, hidden: true })
      if (!old.hidden) jobs.push((b) => b.update(doc(db, 'products', old.id), { hidden: true, updatedAt: now }))
    }
  }

  for (let start = 0; start < jobs.length; start += BATCH_SIZE) {
    const batch = writeBatch(db)
    jobs.slice(start, start + BATCH_SIZE).forEach((job) => job(batch))
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, jobs.length), jobs.length)
  }

  // Lists: new products first, then the rest in their old order. Each category gets a picture of a visible product.
  const products = [...update.new.map((p) => summaries.get(p.id)!), ...catalog.products.filter((p) => !newIds.has(p.id)).map((p) => summaries.get(p.id)!)]
  const visible = products.filter((p) => !p.hidden)
  const categories = (catalog.categories.some((c) => c.slug === update.newCategory.slug)
    ? catalog.categories
    : [...catalog.categories, { ...update.newCategory, count: 0, image: null }]
  ).map((c) => ({ ...c, image: visible.find((p) => p.categories.includes(c.slug) && p.image)?.image ?? c.image }))

  const batch = writeBatch(db)
  writeCatalog(batch, { categories, products }, [...catalog.appliedUpdates, update.id])
  await batch.commit()
  forgetCatalog()
}

/** Show hidden products again with ONLY their new photo (public/data/updates/<id>.json, kind "show") */
export interface ShowUpdate {
  id: string
  kind: 'show'
  title: string
  date: string
  changes: { productId: string; name: string; image: string; images: string[] }[]
}

export async function applyShowUpdate(update: ShowUpdate, onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const now = new Date().toISOString()
  const byId = new Map(update.changes.map((c) => [c.productId, c]))

  for (let start = 0; start < update.changes.length; start += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const c of update.changes.slice(start, start + BATCH_SIZE)) {
      batch.update(doc(db, 'products', c.productId), { image: c.image, images: c.images, hidden: false, inStock: true, updatedAt: now })
    }
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, update.changes.length), update.changes.length)
  }

  const products = catalog.products.map((p) => {
    const c = byId.get(p.id)
    if (!c) return p
    const shown: ProductSummary = { ...p, image: c.image, inStock: true }
    delete shown.hidden
    return shown
  })
  const batch = writeBatch(db)
  writeCatalog(batch, { categories: catalog.categories, products }, [...catalog.appliedUpdates, update.id])
  await batch.commit()
  forgetCatalog()
}

/** Bulk: set many products to in stock (Tersedia) or out of stock (Habis). Products with variants: all variants. */
export async function setStockMany(ids: string[], inStock: boolean, onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const chosen = new Set(ids)
  const now = new Date().toISOString()
  const targets = catalog.products.filter((p) => chosen.has(p.id))

  for (let start = 0; start < targets.length; start += BATCH_SIZE) {
    const part = targets.slice(start, start + BATCH_SIZE)
    const withVariants = part.filter((p) => p.hasVariants)
    const snaps = await Promise.all(withVariants.map((p) => getDoc(doc(db, 'products', p.id))))
    const batch = writeBatch(db)
    for (const p of part) {
      if (!p.hasVariants) batch.update(doc(db, 'products', p.id), { inStock, updatedAt: now })
    }
    snaps.forEach((snap) => {
      if (!snap.exists()) return
      const variants = (snap.data() as ProductDetail).variants.map((v) => ({ ...v, inStock }))
      batch.update(snap.ref, { variants: clean(variants), inStock, updatedAt: now })
    })
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, targets.length), targets.length)
  }

  const products = catalog.products.map((p) => (chosen.has(p.id) ? { ...p, inStock } : p))
  const batch = writeBatch(db)
  writeCatalog(batch, { categories: catalog.categories, products }, catalog.appliedUpdates)
  await batch.commit()
  forgetCatalog()
}

/** Bulk: delete many products for good (with their testimonials) */
export async function deleteMany(ids: string[], onProgress?: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const chosen = new Set(ids)
  const testimonials = (await getDocs(collection(db, 'testimonials'))).docs.filter((t) => chosen.has(t.data().productId as string))
  const refs = [...ids.map((id) => doc(db, 'products', id)), ...testimonials.map((t) => t.ref)]

  for (let start = 0; start < refs.length; start += BATCH_SIZE) {
    const batch = writeBatch(db)
    refs.slice(start, start + BATCH_SIZE).forEach((r) => batch.delete(r))
    await batch.commit()
    onProgress?.(Math.min(start + BATCH_SIZE, refs.length), refs.length)
  }

  const batch = writeBatch(db)
  writeCatalog(batch, { categories: catalog.categories, products: catalog.products.filter((p) => !chosen.has(p.id)) }, catalog.appliedUpdates)
  await batch.commit()
  forgetCatalog()
}

/**
 * Saves "Tampilan Toko": the settings, uploaded banner pictures (one document each), removed banners,
 * and the categories (name, picture, order) in the catalog.
 */
export async function saveStoreSettings(
  settings: StoreSettings,
  uploads: Map<string, string>,
  removedBannerIds: string[],
  categories: Category[],
) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const batch = writeBatch(db)
  for (const [id, image] of uploads) batch.set(doc(db, 'banners', id), { image })
  for (const id of removedBannerIds) batch.delete(doc(db, 'banners', id))
  batch.set(doc(db, 'settings', 'store'), clean({ ...settings, updatedAt: new Date().toISOString() }))
  writeCatalog(batch, { categories, products: catalog.products }, catalog.appliedUpdates)
  await batch.commit()
  forgetCatalog()
}

// For other admin modules (photo import)
export const summarizeProduct = summarize
export const writeCatalogLists = writeCatalog
