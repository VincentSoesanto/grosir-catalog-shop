/* oxlint-disable react/only-export-components -- the cart provider and its hook belong together */
// The shopping cart, shared by every page. Saved in the browser so it survives closing the site.
// One line per product + variant: the same balloon in PINK and in BIRU are two lines.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface CartLine {
  /** productId + variantId, so each product/variant is one line */
  key: string
  productId: string
  variantId: string | null
  name: string
  variantName: string | null
  /** product code (kode) sent in the WhatsApp order; may be empty */
  sku: string
  price: number
  image: string | null
  qty: number
}

export type CartItem = Omit<CartLine, 'key' | 'qty'>

interface CartValue {
  lines: CartLine[]
  /** total number of pieces (for the badge) */
  count: number
  total: number
  add: (item: CartItem, qty?: number) => void
  setQty: (key: string, qty: number) => void
  /** change details of a line, e.g. a new price after the admin changed it */
  update: (key: string, changes: Partial<CartItem>) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)
const STORAGE_KEY = 'vg-cart-v2'
export const MAX_QTY = 9999

function loadCart(): CartLine[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as CartLine[]) : []
  } catch {
    return []
  }
}

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(qty) || 1))

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // storage blocked (private mode): the cart still works until the tab closes
    }
  }, [lines])

  function add(item: CartItem, qty = 1) {
    const key = `${item.productId}:${item.variantId ?? ''}`
    setLines((current) => {
      const existing = current.find((l) => l.key === key)
      if (existing) {
        return current.map((l) => (l === existing ? { ...l, ...item, qty: clampQty(l.qty + qty) } : l))
      }
      return [...current, { ...item, key, qty: clampQty(qty) }]
    })
  }

  const value: CartValue = {
    lines,
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    total: lines.reduce((sum, l) => sum + l.qty * l.price, 0),
    add,
    setQty: (key, qty) => setLines((current) => current.map((l) => (l.key === key ? { ...l, qty: clampQty(qty) } : l))),
    update: (key, changes) => setLines((current) => current.map((l) => (l.key === key ? { ...l, ...changes } : l))),
    remove: (key) => setLines((current) => current.filter((l) => l.key !== key)),
    clear: () => setLines([]),
  }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside <CartProvider>')
  return value
}
