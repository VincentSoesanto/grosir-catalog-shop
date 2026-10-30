import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

// Heading for a home page section, with an optional "Lihat semua" link on the right
export default function SectionTitle({ title, moreLink }: { title: string; moreLink?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between md:mb-4">
      <h2 className="flex items-center gap-2 text-lg font-bold md:text-xl">
        <span className="h-5 w-1.5 rounded-full bg-brand-yellow" aria-hidden="true" />
        {title}
      </h2>
      {moreLink && (
        <Link to={moreLink} className="flex items-center text-sm font-semibold text-brand-pink hover:underline">
          Lihat semua <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  )
}
