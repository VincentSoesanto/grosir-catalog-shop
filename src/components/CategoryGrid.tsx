// Round category pictures. Phone: two rows you swipe sideways. Desktop: a neat grid.
import { Link } from 'react-router-dom'
import type { Category } from '../types/product'
import SectionTitle from './SectionTitle'

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section>
      <SectionTitle title="Kategori" moreLink="/kategori" />
      <ul className="grid auto-cols-[4.75rem] grid-flow-col grid-rows-2 gap-x-2 gap-y-3 overflow-x-auto pb-2 [scrollbar-width:none] md:grid-flow-row md:grid-cols-8 md:grid-rows-none md:overflow-visible">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link to={`/kategori/${c.slug}`} className="group flex flex-col items-center gap-1.5 text-center">
              <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-brand-yellow transition group-hover:ring-brand-pink md:size-20">
                {c.image && <img src={c.image} alt="" loading="lazy" width="240" height="240" className="size-full object-cover" />}
              </span>
              <span className="line-clamp-2 text-[11px] leading-tight text-gray-700 group-hover:text-brand-pink md:text-xs">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
