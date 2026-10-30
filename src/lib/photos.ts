// Product and variant photos.
// - product.images: the product's photos, in order; the first one is the main photo.
// - variant.image: "photo:N" = the product's N-th photo (set on the admin page), a picture path
//   from the catalog files, or null (no own photo: choosing the variant keeps the current photo).
import type { ProductDetail, Variant } from '../types/product'

const REF = 'photo:'

export const photoRef = (index: number) => `${REF}${index}`

/** The picture a variant shows, or null */
export function variantPhoto(product: ProductDetail, variant: Variant): string | null {
  if (!variant.image) return null
  if (variant.image.startsWith(REF)) return product.images[Number(variant.image.slice(REF.length))] ?? null
  return variant.image
}

/** Every picture of a product: its photos, then old variant pictures that aren't among them */
export function allPhotos(product: ProductDetail): string[] {
  const photos = [...product.images]
  for (const v of product.variants) {
    const src = variantPhoto(product, v)
    if (src && !photos.includes(src)) photos.push(src)
  }
  return photos
}
