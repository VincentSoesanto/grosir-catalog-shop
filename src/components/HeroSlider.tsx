// Banner slider at the top of the home page. Swipe on phones, arrows on desktop, moves by itself every 5 s.
// Uses the browser's own scroll-snap for smooth swiping (no slider library needed).
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import BannerLink from './BannerLink'

export interface Banner {
  id: string
  /** picture: a website file or an uploaded picture */
  src: string
  alt: string
  to: string
}

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    const el = track.current
    if (!el) return
    const next = (index + banners.length) % banners.length
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }, [banners.length])

  // Keep the dots in sync when the user swipes
  function onScroll() {
    const el = track.current
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => goTo(active + 1), 5000)
    return () => clearInterval(timer)
  }, [active, paused, goTo])

  return (
    <section
      className="group relative overflow-hidden rounded-2xl shadow-sm"
      aria-roledescription="carousel"
      aria-label="Promo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="flex aspect-video snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => (
          <BannerLink key={b.id} to={b.to} className="w-full shrink-0 snap-center" label={b.alt}>
            <img
              src={b.src}
              alt={b.alt}
              width="1600"
              height="900"
              loading={i === 0 ? 'eager' : 'lazy'}
              className="size-full object-cover"
            />
          </BannerLink>
        ))}
      </div>

      <button
        onClick={() => goTo(active - 1)}
        aria-label="Banner sebelumnya"
        className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 shadow opacity-0 transition group-hover:opacity-100 md:grid"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => goTo(active + 1)}
        aria-label="Banner berikutnya"
        className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 shadow opacity-0 transition group-hover:opacity-100 md:grid"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        {banners.map((b, i) => (
          <button
            key={b.id}
            onClick={() => goTo(i)}
            aria-label={`Banner ${i + 1}`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-brand-pink' : 'w-1.5 bg-white/80'}`}
          />
        ))}
      </div>
    </section>
  )
}
