/* oxlint-disable react/only-export-components -- the settings provider and its hook belong together */
// "Tampilan Toko": things the admin changes now and then (banners, home page rows, info bar, shop info,
// the "Tentang Kami" page).
// Stored in Firestore: settings/store (small text) + banners/<id> (one picture per banner).
// Until the admin saves for the first time (and always in demo mode), DEFAULT_SETTINGS is used.
import { doc, getDoc } from 'firebase/firestore/lite'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, firebaseConfigured } from './firebase'
import { SHOP } from './shop'

export interface BannerSetting {
  id: string
  /** a picture that is part of the website files; missing = the picture is stored in banners/<id> */
  src?: string
  /** where a click goes: "/produk" or "/kategori/<slug>" */
  to: string
}

export interface HomeRow {
  title: string
  /** category slug; "" = newest products */
  category: string
}

export interface ShopInfo {
  /** as shown, e.g. 0812-0000-0000 */
  whatsappDisplay: string
  hours: string
  address: string
  mapsUrl: string
  instagram: string
}

/** A text block on the "Tentang Kami" page */
export interface AboutSection {
  title: string
  text: string
}

/** Google Maps reviews shown on "Tentang Kami" (typed in by the admin: showing them automatically needs Google's paid API) */
export interface GoogleReviews {
  /** e.g. 4.8; 0 = not filled in yet (stars hidden) */
  rating: number
  count: number
  url: string
  /** opens Google's "write a review" form for the shop */
  writeUrl: string
  quotes: { name: string; stars: number; text: string }[]
}

export interface StoreSettings {
  slides: BannerSetting[]
  side: BannerSetting[]
  homeRows: HomeRow[]
  infoBar: string
  shop: ShopInfo
  aboutSlides: BannerSetting[]
  aboutSections: AboutSection[]
  googleReviews: GoogleReviews
}

export const DEFAULT_SETTINGS: StoreSettings = {
  slides: [
    { id: 'promo-balon', src: '/img/banners/promo-balon.svg', to: '/kategori/balon' },
    { id: 'alat-tulis', src: '/img/banners/alat-tulis.svg', to: '/kategori/alat-tulis' },
    { id: 'pesta', src: '/img/banners/pesta.svg', to: '/kategori/perlengkapan-pesta' },
  ],
  side: [
    { id: 'kertas-kado', src: '/img/banners/kertas-kado.svg', to: '/kategori/kertas-kado' },
    { id: 'semua-produk', src: '/img/banners/semua-produk.svg', to: '/produk' },
  ],
  homeRows: [
    { title: 'Produk Terbaru', category: '' },
    { title: 'Aneka Balon', category: 'balon' },
    { title: 'Alat Tulis', category: 'alat-tulis' },
  ],
  infoBar: 'Demo shop: semua produk dan harga di sini adalah contoh',
  aboutSlides: [{ id: 'kunjungi-toko', src: '/img/banners/store.svg', to: '/produk' }],
  // Example texts (the admin edits them in "Tampilan Toko")
  aboutSections: [
    {
      title: 'Cara Kerja',
      text: '1. Pilih barang di website dan masukkan ke keranjang.\n2. Klik "Pesan via WhatsApp": pesanan kamu langsung terkirim ke admin kami.\n3. Admin membalas dengan total harga + ongkir dan cara pembayaran.\n4. Setelah pembayaran diterima, pesanan kami siapkan dan kirim.',
    },
    {
      title: 'Pengecekan Kualitas',
      text: 'Sebelum dikemas, barang pesanan dicek jumlah dan kondisinya supaya sesuai dengan pesanan kamu.',
    },
    {
      title: 'Pengiriman',
      text: 'Pesanan dikirim dari toko kami. Ongkir dan pilihan kurir dikonfirmasi lewat WhatsApp. Bisa juga diambil langsung di toko.',
    },
    {
      title: 'Unpacking',
      text: 'Saat paket diterima, mohon rekam video unboxing dari awal membuka paket. Video ini kami perlukan jika ada barang yang kurang atau rusak.',
    },
  ],
  // url "" = the Google reviews box is hidden until the admin fills it in
  googleReviews: { rating: 0, count: 0, url: '', writeUrl: '', quotes: [] },
  shop: {
    whatsappDisplay: SHOP.whatsappDisplay,
    hours: SHOP.hours,
    address: SHOP.address,
    mapsUrl: SHOP.mapsUrl,
    instagram: SHOP.instagram,
  },
}

/** "0812-0000-0000" -> "6281200000000" (the format WhatsApp links need) */
export function whatsappNumber(display: string) {
  const digits = display.replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

/** Copies the shop info into SHOP, which the whole site reads (WhatsApp links, footer, header...) */
function applyShopInfo(info: ShopInfo) {
  Object.assign(SHOP, info, { whatsapp: whatsappNumber(info.whatsappDisplay) })
}

export async function loadStoreSettings(): Promise<StoreSettings> {
  if (!firebaseConfigured) return DEFAULT_SETTINGS
  const snap = await getDoc(doc(db, 'settings', 'store')).catch(() => null)
  if (!snap?.exists()) return DEFAULT_SETTINGS
  const saved = snap.data() as Partial<StoreSettings>
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    shop: { ...DEFAULT_SETTINGS.shop, ...saved.shop },
    googleReviews: { ...DEFAULT_SETTINGS.googleReviews, ...saved.googleReviews },
  }
}

/** The picture of one banner: a website file, or the uploaded picture from banners/<id> */
export async function bannerImage(b: BannerSetting): Promise<string | null> {
  if (b.src) return b.src
  if (!firebaseConfigured) return null
  const snap = await getDoc(doc(db, 'banners', b.id)).catch(() => null)
  return snap?.exists() ? (snap.data().image as string) : null
}

const SettingsContext = createContext<StoreSettings>(DEFAULT_SETTINGS)

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  useEffect(() => {
    loadStoreSettings().then((s) => {
      applyShopInfo(s.shop)
      setSettings(s)
    })
  }, [])
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useStoreSettings() {
  return useContext(SettingsContext)
}
