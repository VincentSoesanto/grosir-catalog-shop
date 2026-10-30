/* oxlint-disable react/only-export-components -- the toast provider and its hook belong together */
// Small pop-up message at the bottom of the screen, e.g. "Barang telah ditambahkan ke keranjang".
// It disappears by itself after a few seconds. A new message replaces the old one.
import { CheckCircle2 } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Toast {
  id: number
  text: string
  link?: { to: string; label: string }
}

const ToastContext = createContext<((text: string, link?: Toast['link']) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((text: string, link?: Toast['link']) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, link })
    timer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Above the phone bottom menu / product bar; lower on desktop */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex animate-[toast-in_.2s_ease-out] items-center gap-3 rounded-full bg-ink py-2.5 pl-4 pr-2.5 text-sm text-white shadow-lg"
          >
            <CheckCircle2 className="size-5 shrink-0 text-brand-yellow" />
            <span>{toast.text}</span>
            {toast.link && (
              <Link to={toast.link.to} onClick={() => setToast(null)} className="shrink-0 rounded-full bg-brand-yellow px-3 py-1 font-bold text-ink">
                {toast.link.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}

/** Show "added to cart" with a link to the cart */
export function useAddedToCartToast() {
  const show = useToast()
  return useCallback(() => show('Barang telah ditambahkan ke keranjang', { to: '/keranjang', label: 'Lihat' }), [show])
}
