// "Impor Foto": products made from dropped photos. The file name holds the data: KODE_Nama_Harga.jpg
// e.g. "AT101_Pensil Warna 12 Warna_15000.jpg". Kode that already exists = that product is updated.
import { addDoc, collection, doc, getDocs, limit, orderBy, query, writeBatch } from 'firebase/firestore/lite'
import type { Category, ProductDetail, ProductSummary } from '../types/product'
import { forgetCatalog, loadFullCatalog } from './catalog'
import { summarizeProduct, writeCatalogLists } from './catalogAdmin'
import { db } from './firebase'
import { shrinkImage, shrinkUrl } from './image'

export const FALLBACK_CATEGORY = { name: 'Barang Khusus', slug: 'barang-khusus' }
// Kode prefixes whose category is fixed by hand (the old website's categories were messy for these)
const PREFIX_FIX: Record<string, string> = {
  BL: 'balon',
}

export interface ImportRow {
  key: string
  file: File
  preview: string
  kode: string
  name: string
  price: number
  category: string
  /** id of the product with the same kode, if there is one */
  existingId: string | null
  /** why the file name couldn't be read */
  problem: string
}

export interface ImportHistory {
  id: string
  date: string
  items: { kode: string; name: string; price: number; productId: string; isNew: boolean }[]
}

/** "AT101_Pensil Warna_15.000" -> kode, name, price. Price may have dots, commas or "Rp". */
export function parseFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  const parts = base.split('_').map((p) => p.trim())
  if (parts.length < 3) return { kode: '', name: base, price: 0, problem: 'Nama file harus KODE_Nama_Harga' }
  const kode = parts[0].toUpperCase()
  const price = Number(parts[parts.length - 1].replace(/[^\d]/g, ''))
  const name = parts.slice(1, -1).join(' ').replace(/\s+/g, ' ')
  const problem = !kode ? 'Kode kosong' : !name ? 'Nama kosong' : !(price > 0) ? 'Harga tidak terbaca' : ''
  return { kode, name, price, problem }
}

/** Category from the kode prefix: the category most products with that prefix are in */
export function guessCategory(kode: string, products: ProductSummary[], categories: Category[]) {
  const prefix = kode.toUpperCase().match(/^[A-Z]+/)?.[0]
  if (!prefix) return FALLBACK_CATEGORY.slug
  if (PREFIX_FIX[prefix] && categories.some((c) => c.slug === PREFIX_FIX[prefix])) return PREFIX_FIX[prefix]
  const counts = new Map<string, number>()
  for (const p of products) {
    if (p.sku.toUpperCase().match(/^[A-Z]+/)?.[0] !== prefix) continue
    const cat = p.categories.find((c) => c !== FALLBACK_CATEGORY.slug)
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  let best = FALLBACK_CATEGORY.slug
  let most = 0
  for (const [cat, n] of counts) if (n > most) [best, most] = [cat, n]
  return best
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Saves the rows: new products (with their photo) or updates of the product with the same kode
 * (new name, price and ONLY the new photo; shown and in stock). Saved in small groups because of the photos;
 * the product lists last. Then one history entry.
 */
export async function importRows(rows: ImportRow[], onProgress: (done: number, total: number) => void) {
  const catalog = await loadFullCatalog()
  if (catalog.source !== 'firestore') throw new Error('Data belum diimpor ke database')
  const now = new Date().toISOString()
  const products = [...catalog.products]
  const ids = new Set(products.map((p) => p.id))
  const categories = catalog.categories.some((c) => c.slug === FALLBACK_CATEGORY.slug)
    ? catalog.categories
    : [...catalog.categories, { ...FALLBACK_CATEGORY, count: 0, image: null }]
  const history: ImportHistory['items'] = []
  const GROUP = 15 // ~15 photos per save stays well under Firestore's size limit per save

  for (let start = 0; start < rows.length; start += GROUP) {
    const batch = writeBatch(db)
    for (const row of rows.slice(start, start + GROUP)) {
      const large = await shrinkImage(row.file, 1000, 160_000)
      const small = await shrinkUrl(large, 320, 30_000)
      const fullName = `${row.name} - ${row.kode}`
      if (row.existingId) {
        const old = products.find((p) => p.id === row.existingId)!
        const summary: ProductSummary = { ...old, name: fullName, sku: row.kode, price: row.price, fromPrice: false, image: small, inStock: true, categories: old.categories }
        delete summary.hidden
        batch.update(doc(db, 'products', old.id), {
          name: fullName, sku: row.kode, price: row.price, fromPrice: false, image: small, images: [large], inStock: true, hidden: false, updatedAt: now,
        })
        products.splice(products.indexOf(old), 1, summary)
        history.push({ kode: row.kode, name: fullName, price: row.price, productId: old.id, isNew: false })
      } else {
        let id = slug(row.kode) || `p${Date.now().toString(36)}`
        for (let i = 2; ids.has(id); i++) id = `${slug(row.kode)}-${i}`
        ids.add(id)
        const product: ProductDetail = {
          id, sku: row.kode, name: fullName, price: row.price, fromPrice: false, hasVariants: false, categories: [row.category],
          image: small, inStock: true, images: [large], variantLabel: 'Variasi', variants: [], description: '',
        }
        const summary = summarizeProduct(product)
        batch.set(doc(db, 'products', id), JSON.parse(JSON.stringify({ ...product, ...summary, sku: row.kode, updatedAt: now })))
        products.unshift(summary)
        history.push({ kode: row.kode, name: fullName, price: row.price, productId: id, isNew: true })
      }
    }
    await batch.commit()
    onProgress(Math.min(start + GROUP, rows.length), rows.length)
  }

  // categories without a picture get one of their new products' photos
  const withPictures = categories.map((c) => c.image ? c : { ...c, image: products.find((p) => !p.hidden && p.image && p.categories.includes(c.slug))?.image ?? null })
  const batch = writeBatch(db)
  writeCatalogLists(batch, { categories: withPictures, products }, catalog.appliedUpdates)
  await batch.commit()
  await addDoc(collection(db, 'imports'), { date: now, items: history })
  forgetCatalog()
}

export async function loadImportHistory(max = 20): Promise<ImportHistory[]> {
  const snap = await getDocs(query(collection(db, 'imports'), orderBy('date', 'desc'), limit(max)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ImportHistory, 'id'>) }))
}
