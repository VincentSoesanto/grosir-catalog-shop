// Placeholder for pages we haven't built yet, so links never show an empty or broken page.
import { Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ComingSoonPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <Construction className="size-12 text-brand-pink" />
      <h1 className="text-xl font-bold">Halaman ini sedang dibuat</h1>
      <p className="text-gray-600">Sebentar lagi siap. Sementara itu, lihat produk di beranda dulu ya.</p>
      <Link to="/" className="rounded-full bg-brand-pink px-6 py-2.5 font-semibold text-white">Ke Beranda</Link>
    </div>
  )
}
