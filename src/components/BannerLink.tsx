// A banner picture that links to a page, or just a picture when it has no link (to = "")
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function BannerLink({ to, className, label, children }: { to: string; className: string; label?: string; children: ReactNode }) {
  if (!to) return <div className={className}>{children}</div>
  return (
    <Link to={to} className={className} aria-label={label}>
      {children}
    </Link>
  )
}
