// A titled row of products on the home page
import type { ProductSection as Section } from '../types/product'
import ProductGrid from './ProductGrid'
import SectionTitle from './SectionTitle'

export default function ProductSection({ section }: { section: Section }) {
  if (section.items.length === 0) return null
  return (
    <section>
      <SectionTitle title={section.title} moreLink={section.categorySlug ? `/kategori/${section.categorySlug}` : '/produk'} />
      <ProductGrid products={section.items} />
    </section>
  )
}
