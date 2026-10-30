// Shop details shown across the site (demo values). The admin can change the contact details in "Tampilan Toko".
export const SHOP = {
  name: 'Toko Contoh',
  tagline: 'Party Supplies · Stationery · Fancy',
  whatsapp: '6281200000000', // international format, no + or spaces (for wa.me links)
  whatsappDisplay: '0812-0000-0000',
  instagram: 'tokocontoh',
  address: 'Jl. Contoh No. 1, Kota Contoh',
  mapsUrl: 'https://example.com/peta',
  hours: 'Senin–Sabtu 08.00–16.00',
}

export function whatsappLink(message: string) {
  return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`
}

const rupiah = new Intl.NumberFormat('id-ID')
export function formatRupiah(value: number) {
  return `Rp${rupiah.format(value)}`
}
