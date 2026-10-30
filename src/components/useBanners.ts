// Turns banner settings into banners with their picture (uploaded pictures are loaded from the database).
import { useEffect, useState } from 'react'
import { bannerImage, type BannerSetting } from '../lib/storeSettings'
import { SHOP } from '../lib/shop'
import type { Banner } from './HeroSlider'

export function useBanners(list: BannerSetting[]): Banner[] {
  const [loaded, setLoaded] = useState<{ key: string; banners: Banner[] }>({ key: '', banners: [] })
  const key = JSON.stringify(list)
  useEffect(() => {
    let alive = true
    Promise.all(list.map(async (b) => ({ id: b.id, to: b.to, alt: SHOP.name, src: (await bannerImage(b)) ?? '' }))).then(
      (banners) => alive && setLoaded({ key, banners: banners.filter((b) => b.src) }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return loaded.key === key ? loaded.banners : []
}
