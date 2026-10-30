// Quantity picker:  [ − ]  3  [ + ]   (you can also type a number)
import { Minus, Plus } from 'lucide-react'
import { MAX_QTY } from '../lib/cart'

export default function QtyStepper({ value, onChange, small }: { value: number; onChange: (qty: number) => void; small?: boolean }) {
  const size = small ? 'size-8' : 'size-10'
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Kurangi jumlah"
        className={`grid ${size} place-items-center text-gray-700 hover:bg-brand-yellow/30 disabled:opacity-30`}
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QTY}
        value={value}
        onChange={(e) => onChange(Math.min(MAX_QTY, Math.max(1, Number(e.target.value) || 1)))}
        aria-label="Jumlah"
        className={`${small ? 'w-10 text-sm' : 'w-12'} bg-transparent text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        onClick={() => onChange(Math.min(MAX_QTY, value + 1))}
        aria-label="Tambah jumlah"
        className={`grid ${size} place-items-center text-gray-700 hover:bg-brand-yellow/30`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
