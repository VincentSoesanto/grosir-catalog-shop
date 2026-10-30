// Makes the demo catalog: made-up products + simple SVG placeholder pictures.
//   node scripts/make-demo-data.mjs
// Writes public/data/catalog.json, public/data/products/<id>.json and public/img/** (logo, banners,
// categories, products). The shop reads these files when no Firebase project is set (demo mode), and the
// admin page can import them into Firestore once a project is connected.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

function write(path, content) {
  const full = join(root, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

// ---------- data ----------
const CATEGORIES = [
  { slug: 'alat-tulis', name: 'Alat Tulis', color: '#3b82f6', icon: '✏️' },
  { slug: 'balon', name: 'Balon', color: '#e6007e', icon: '🎈' },
  { slug: 'perlengkapan-pesta', name: 'Perlengkapan Pesta', color: '#8b5cf6', icon: '🎉' },
  { slug: 'kertas-kado', name: 'Kertas Kado', color: '#10b981', icon: '🎁' },
  { slug: 'perlengkapan-ulang-tahun', name: 'Perlengkapan Ulang Tahun', color: '#f59e0b', icon: '🎂' },
]

// [sku, name, price, category, inStock, variants?]
const PRODUCTS = [
  ['AT101', 'Pensil Warna 12 Warna', 15000, 'alat-tulis', true],
  ['AT102', 'Pulpen Gel Hitam (isi 12)', 24000, 'alat-tulis', true],
  ['AT103', 'Buku Tulis 38 Lembar (isi 10)', 32000, 'alat-tulis', true],
  ['AT104', 'Penghapus Karakter', 3500, 'alat-tulis', false],
  ['', 'Spidol Warna Set', 0, 'alat-tulis', true, [['AT105-6', '6 warna', 12000], ['AT105-12', '12 warna', 21000], ['AT105-24', '24 warna', 38000]]],
  ['BL201', 'Balon Latex Metalik 12 inch (isi 50)', 28000, 'balon', true],
  ['BL202', 'Balon Foil Angka', 6500, 'balon', true],
  ['', 'Balon Foil Bintang', 0, 'balon', true, [['BL203-M', 'Merah', 5000], ['BL203-E', 'Emas', 5000], ['BL203-P', 'Perak', 5000]]],
  ['BL204', 'Pompa Balon Tangan', 18000, 'balon', true],
  ['PP301', 'Topi Pesta Kerucut (isi 10)', 12000, 'perlengkapan-pesta', true],
  ['PP302', 'Terompet Kertas (isi 12)', 15000, 'perlengkapan-pesta', true],
  ['PP303', 'Confetti Popper', 9000, 'perlengkapan-pesta', true],
  ['PP304', 'Piring Kertas Motif (isi 10)', 11000, 'perlengkapan-pesta', true],
  ['KK401', 'Kertas Kado Motif Bunga (isi 10)', 20000, 'kertas-kado', true],
  ['KK402', 'Kertas Kado Polos Jumbo', 4000, 'kertas-kado', true],
  ['KK403', 'Pita Satin 1 cm (1 rol)', 7500, 'kertas-kado', true],
  ['KK404', 'Paper Bag Kecil (isi 12)', 16000, 'kertas-kado', false],
  ['UT501', 'Lilin Angka Ulang Tahun', 4500, 'perlengkapan-ulang-tahun', true],
  ['UT502', 'Banner Happy Birthday', 14000, 'perlengkapan-ulang-tahun', true],
  ['UT503', 'Cake Topper Karakter', 8000, 'perlengkapan-ulang-tahun', true],
  ['UT504', 'Lilin Ulir Warna-warni (isi 24)', 6000, 'perlengkapan-ulang-tahun', true],
]

// ---------- pictures ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Breaks a name into lines of at most `max` characters */
function lines(text, max) {
  const out = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  return out
}

function productSvg(name, sku, color, icon, size) {
  const text = lines(name, 18)
    .slice(0, 3)
    .map((l, i) => `<text x="50%" y="${size * 0.66 + i * size * 0.075}" font-size="${size * 0.06}" font-weight="700" fill="#1f2328" text-anchor="middle">${esc(l)}</text>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" font-family="system-ui,sans-serif">
<rect width="100%" height="100%" fill="#fffbea"/>
<circle cx="50%" cy="${size * 0.36}" r="${size * 0.22}" fill="${color}" opacity="0.18"/>
<text x="50%" y="${size * 0.43}" font-size="${size * 0.2}" text-anchor="middle">${icon}</text>
${text}
<text x="50%" y="${size * 0.94}" font-size="${size * 0.045}" fill="#6b7280" text-anchor="middle">${esc(sku || 'DEMO')}</text>
</svg>`
}

function bannerSvg(title, subtitle, from, to, w = 1600, h = 900) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="system-ui,sans-serif">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${w * 0.85}" cy="${h * 0.2}" r="${h * 0.35}" fill="#fff" opacity="0.12"/>
<circle cx="${w * 0.1}" cy="${h * 0.9}" r="${h * 0.25}" fill="#fff" opacity="0.1"/>
<text x="${w * 0.07}" y="${h * 0.48}" font-size="${h * 0.13}" font-weight="800" fill="#fff">${esc(title)}</text>
<text x="${w * 0.07}" y="${h * 0.62}" font-size="${h * 0.06}" fill="#fff" opacity="0.9">${esc(subtitle)}</text>
</svg>`
}

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="165" viewBox="0 0 320 165" font-family="system-ui,sans-serif">
<rect x="6" y="6" width="308" height="153" rx="28" fill="#e6007e"/>
<text x="160" y="82" font-size="54" font-weight="800" fill="#f5e400" text-anchor="middle">Toko</text>
<text x="160" y="132" font-size="42" font-weight="700" fill="#fff" text-anchor="middle">Contoh</text>
</svg>`

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
<rect width="48" height="48" rx="12" fill="#e6007e"/>
<path d="M14 18h20l-2 18H16z" fill="#f5e400"/><path d="M19 18a5 5 0 0 1 10 0" fill="none" stroke="#f5e400" stroke-width="3"/>
</svg>`

// ---------- build ----------
rmSync(join(root, 'data'), { recursive: true, force: true })
rmSync(join(root, 'img'), { recursive: true, force: true })

write('img/logo.svg', LOGO)
write('favicon.svg', FAVICON)
write('img/banners/promo-balon.svg', bannerSvg('Promo Balon', 'Diskon untuk pembelian grosir', '#e6007e', '#ff6fb5'))
write('img/banners/alat-tulis.svg', bannerSvg('Alat Tulis', 'Lengkap untuk sekolah dan kantor', '#2563eb', '#60a5fa'))
write('img/banners/pesta.svg', bannerSvg('Perlengkapan Pesta', 'Semua untuk pesta yang meriah', '#7c3aed', '#c084fc'))
write('img/banners/kertas-kado.svg', bannerSvg('Kertas Kado', 'Motif baru setiap minggu', '#059669', '#34d399', 800, 450))
write('img/banners/semua-produk.svg', bannerSvg('Semua Produk', 'Lihat katalog lengkap', '#d97706', '#fbbf24', 800, 450))
write('img/banners/store.svg', bannerSvg('Kunjungi Toko Kami', 'Toko Contoh · demo shop', '#a8005c', '#e6007e', 800, 450))

const catColor = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]))
const summaries = []
let nextId = 1001

for (const [sku, name, price, category, inStock, variantRows] of PRODUCTS) {
  const id = String(nextId++)
  const { color, icon } = catColor[category]
  write(`img/products/${id}.svg`, productSvg(name, sku, color, icon, 320))
  write(`img/products/large/${id}.svg`, productSvg(name, sku, color, icon, 800))
  const image = `/img/products/${id}.svg`
  const large = `/img/products/large/${id}.svg`

  const variants = (variantRows ?? []).map(([vSku, vName, vPrice]) => ({ id: `${id}-${vSku.toLowerCase()}`, name: vName, sku: vSku, price: vPrice, inStock: true, image: null }))
  const prices = variants.map((v) => v.price)
  const summary = {
    id,
    sku: variants.length ? '' : sku,
    name,
    price: variants.length ? Math.min(...prices) : price,
    fromPrice: variants.length > 0 && new Set(prices).size > 1,
    hasVariants: variants.length > 0,
    categories: [category],
    image,
    inStock,
  }
  summaries.push(summary)
  write(
    `data/products/${id}.json`,
    JSON.stringify({
      ...summary,
      images: [large],
      variantLabel: 'Variasi',
      variants,
      description: `${name}.\n\nProduk contoh untuk demo toko: nama, harga dan gambar dibuat-buat.`,
    }),
  )
}

const categories = CATEGORIES.map((c) => {
  write(`img/categories/${c.slug}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
<rect width="240" height="240" fill="${c.color}" opacity="0.2"/><text x="120" y="150" font-size="100" text-anchor="middle">${c.icon}</text>
</svg>`)
  return { name: c.name, slug: c.slug, count: summaries.filter((p) => p.categories.includes(c.slug)).length, image: `/img/categories/${c.slug}.svg` }
})

// Newest first, like the real catalog
write('data/catalog.json', JSON.stringify({ categories, products: [...summaries].reverse() }))
// "Update Harga & Foto" reads this list of prepared updates; the demo has none
write('data/updates/index.json', '[]')

console.log(`Demo data: ${summaries.length} products in ${categories.length} categories`)
