// Tentang Kami: banner slider + text blocks (Cara Kerja, Pengecekan Kualitas, ...) + store info. All editable in "Tampilan Toko".
import { useEffect } from 'react'
import GoogleReviewsBox from '../components/GoogleReviewsBox'
import HeroSlider from '../components/HeroSlider'
import StoreInfo from '../components/StoreInfo'
import { useBanners } from '../components/useBanners'
import { SHOP } from '../lib/shop'
import { useStoreSettings } from '../lib/storeSettings'

export default function AboutPage() {
  const settings = useStoreSettings()
  const slides = useBanners(settings.aboutSlides)

  useEffect(() => {
    document.title = `Tentang Kami | ${SHOP.name}`
    return () => {
      document.title = SHOP.name
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-4 md:space-y-10 md:py-6">
      {settings.aboutSlides.length > 0 &&
        (slides.length > 0 ? <HeroSlider banners={slides} /> : <div className="aspect-video animate-pulse rounded-2xl bg-brand-yellow/20" />)}

      <h1 className="text-2xl font-bold md:text-3xl">Tentang Kami</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {settings.aboutSections.map((sec, i) => (
          <section key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-extrabold text-brand-pink-dark">{i + 1}</span>
              {sec.title}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{sec.text}</p>
          </section>
        ))}
      </div>

      <GoogleReviewsBox reviews={settings.googleReviews} />

      <StoreInfo />
    </div>
  )
}
