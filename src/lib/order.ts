// Builds the WhatsApp order message from the cart. Nothing is saved: the message IS the order.
import type { CartLine } from './cart'
import { formatRupiah, SHOP } from './shop'

export interface Buyer {
  name: string
  address: string
  note: string
}

// No 0/O, 1/I/L: easy to read out loud in a chat
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** e.g. TC-261015-1542-K7  (date, time, 2 random characters so two orders in the same minute differ) */
export function makeOrderNumber(now = new Date()) {
  const two = (n: number) => String(n).padStart(2, '0')
  const random = Array.from({ length: 2 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  return `TC-${two(now.getFullYear() % 100)}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}-${random}`
}

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
/** e.g. "15 Okt 2026, 15:42" */
export function formatDateTime(d: Date) {
  return `${dateFormat.format(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The text sent to WhatsApp. *text* is bold in WhatsApp. */
export function buildOrderMessage(lines: CartLine[], buyer: Buyer, orderNumber: string, now = new Date()) {
  const items = lines.map((l, i) => {
    const rows = [`${i + 1}. ${l.name}`]
    if (l.variantName) rows.push(`   Variasi: ${l.variantName}`)
    if (l.sku) rows.push(`   Kode: ${l.sku}`)
    rows.push(`   ${l.qty} x ${formatRupiah(l.price)} = ${formatRupiah(l.qty * l.price)}`)
    return rows.join('\n')
  })
  const pieces = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0)

  return [
    `Halo ${SHOP.name}, saya mau pesan:`,
    '',
    `*No. Pesanan:* ${orderNumber}`,
    `*Tanggal:* ${formatDateTime(now)}`,
    `*Nama:* ${buyer.name.trim()}`,
    '',
    ...items.flatMap((item) => [item, '']),
    `*Total: ${formatRupiah(total)}* (${pieces} barang)`,
    '_Belum termasuk ongkir_',
    ...(buyer.address.trim() ? ['', `*Alamat:* ${buyer.address.trim()}`] : []),
    ...(buyer.note.trim() ? ['', `*Catatan:* ${buyer.note.trim()}`] : []),
  ].join('\n')
}
