// Beranda (home page)
import BannerLink from '../components/BannerLink'
import CategoryGrid from '../components/CategoryGrid'
import HeroSlider from '../components/HeroSlider'
import { ProductGridSkeleton } from '../components/ProductGrid'
import ProductSection from '../components/ProductSection'
import StoreInfo from '../components/StoreInfo'
import { useBanners } from '../components/useBanners'
import { homeSections, useCatalog } from '../lib/catalog'
import { useStoreSettings } from '../lib/storeSettings'

export default function HomePage() {
  const { catalog } = useCatalog()
  const settings = useStoreSettings()
  const slides = useBanners(settings.slides)
  const side = useBanners(settings.side)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 md:space-y-12 md:py-6">
      {/* Desktop: big slider + two small banners on the right (like Shopee). Phone: slider, then the two small banners side by side. */}
      <div className="grid gap-2.5 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {slides.length > 0 ? <HeroSlider banners={slides} /> : <div className="aspect-video animate-pulse rounded-2xl bg-brand-yellow/20" />}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-1 lg:grid-rows-2">
          {side.map((b) => (
            <BannerLink key={b.id} to={b.to} className="block overflow-hidden rounded-2xl shadow-sm lg:h-full">
              <img src={b.src} alt={b.alt} width="800" height="450" className="aspect-video w-full object-cover transition hover:scale-[1.02] lg:aspect-auto lg:h-full" />
            </BannerLink>
          ))}
        </div>
      </div>

      {catalog ? (
        <>
          <CategoryGrid categories={catalog.categories.slice(0, 16)} />
          {homeSections(catalog, settings.homeRows).map((s, i) => <ProductSection key={i} section={s} />)}
        </>
      ) : (
        <ProductGridSkeleton />
      )}
      <StoreInfo />
    </div>
  )
}
