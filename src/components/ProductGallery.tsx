// Product photos: one big photo + small thumbnails to switch. Shows the chosen variant's own photo when it has one.
import { ImageOff } from 'lucide-react'

interface Props {
  images: string[]
  active: number
  onSelect: (index: number) => void
  alt: string
  dimmed?: boolean
}

export default function ProductGallery({ images, active, onSelect, alt, dimmed }: Props) {
  const main = images[active] ?? images[0]

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {main ? (
          <img src={main} alt={alt} width="800" height="800" className={`size-full object-contain ${dimmed ? 'opacity-50 grayscale' : ''}`} />
        ) : (
          <span className="grid size-full place-items-center text-brand-pink/40">
            <ImageOff className="size-16" aria-label="Belum ada foto" />
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                onClick={() => onSelect(i)}
                aria-label={`Foto ${i + 1}`}
                aria-current={i === active}
                className={`block size-16 overflow-hidden rounded-lg bg-white ring-2 transition md:size-20 ${
                  i === active ? 'ring-brand-pink' : 'ring-transparent hover:ring-brand-yellow'
                }`}
              >
                <img src={src} alt="" loading="lazy" width="160" height="160" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
