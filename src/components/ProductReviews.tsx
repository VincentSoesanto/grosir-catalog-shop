// "Testimoni Pembeli": screenshots of real customer chats, added by the admin. Tap one to see it big.
// The product page only shows this when the product has at least one.
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Testimonial } from '../types/review'

export default function ProductReviews({ testimonials }: { testimonials: Testimonial[] }) {
  const [big, setBig] = useState<Testimonial | null>(null)

  return (
    <section className="mt-10 rounded-2xl bg-white p-4 ring-1 ring-gray-100 md:p-6">
      <h2 className="mb-1 text-lg font-bold md:text-xl">Testimoni Pembeli</h2>
      <p className="mb-4 text-sm text-gray-500">Chat asli dari pembeli kami</p>
      <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {testimonials.map((t) => (
          <li key={t.id} className="w-36 shrink-0 md:w-48">
            <button onClick={() => setBig(t)} className="block w-full overflow-hidden rounded-xl ring-1 ring-gray-200 transition hover:ring-2 hover:ring-brand-yellow" aria-label="Lihat testimoni">
              <img src={t.image} alt={t.caption ?? 'Testimoni pembeli'} loading="lazy" className="aspect-[9/16] w-full object-cover object-top" />
            </button>
            {t.caption && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{t.caption}</p>}
          </li>
        ))}
      </ul>

      {big && (
        <div role="dialog" aria-modal="true" aria-label="Testimoni" onClick={() => setBig(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4">
          <img src={big.image} alt={big.caption ?? ''} className="max-h-full max-w-full rounded-lg object-contain" />
          <button onClick={() => setBig(null)} aria-label="Tutup" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink">
            <X className="size-5" />
          </button>
        </div>
      )}
    </section>
  )
}
