// 1-5 stars; fractions like 4.6 are shown partly filled
import { Star } from 'lucide-react'

export function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative">
          <Star className={`${size} text-gray-300`} fill="currentColor" strokeWidth={0} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.min(1, Math.max(0, value - n + 1)) * 100}%` }}>
            <Star className={`${size} text-amber-400`} fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
    </span>
  )
}
