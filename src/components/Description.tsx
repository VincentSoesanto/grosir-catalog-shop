// Product description that starts folded (6 lines) with "Baca selengkapnya" when it's long.
import { ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

export default function Description({ text }: { text: string }) {
  const box = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [isLong, setIsLong] = useState(false)

  // Only show the button when the text really is longer than the folded height
  useLayoutEffect(() => {
    const el = box.current
    if (el && !open) setIsLong(el.scrollHeight > el.clientHeight + 2)
  }, [text, open])

  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
      <h2 className="mb-2 font-bold">Deskripsi</h2>
      <div className="relative">
        <p ref={box} className={`whitespace-pre-line text-sm leading-relaxed text-gray-700 ${open ? '' : 'line-clamp-6'}`}>
          {text}
        </p>
        {isLong && !open && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white" />}
      </div>
      {(isLong || open) && (
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-pink hover:underline">
          {open ? 'Tutup' : 'Baca selengkapnya'}
          <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
