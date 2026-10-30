// "Kunjungi Toko Kami": the store banner next to real, clickable contact details.
import { Clock, MapPin } from 'lucide-react'
import { SHOP } from '../lib/shop'
import { InstagramIcon, WhatsAppIcon } from './BrandIcons'

export default function StoreInfo() {
  const rows = [
    { icon: MapPin, label: 'Alamat', value: SHOP.address, href: SHOP.mapsUrl },
    { icon: Clock, label: 'Jam buka', value: SHOP.hours },
    { icon: WhatsAppIcon, label: 'WhatsApp', value: SHOP.whatsappDisplay, href: `https://wa.me/${SHOP.whatsapp}` },
    { icon: InstagramIcon, label: 'Instagram', value: `@${SHOP.instagram}`, href: `https://instagram.com/${SHOP.instagram}` },
  ]

  return (
    <section className="grid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 md:grid-cols-2">
      <img
        src="/img/banners/store.svg"
        alt="Kunjungi Toko Kami"
        loading="lazy"
        width="800"
        height="450"
        className="aspect-video size-full object-cover"
      />
      <div className="flex flex-col justify-center gap-4 p-5 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">Kunjungi Toko Kami</h2>
        <p className="text-sm text-gray-600">Belanja online praktis, atau datang langsung ke toko. Banyak pilihan untuk setiap momen spesial!</p>
        <ul className="space-y-3">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-pink/10 text-brand-pink">
                <Icon className="size-4" />
              </span>
              <span className="text-sm">
                <span className="block text-xs text-gray-500">{label}</span>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand-pink hover:underline">{value}</a>
                ) : (
                  <span className="font-semibold">{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
