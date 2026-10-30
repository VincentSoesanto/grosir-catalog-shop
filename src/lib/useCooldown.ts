// Blocks a button for a moment after it's pressed, so tapping it many times fast doesn't add the item many times.
import { useEffect, useRef, useState } from 'react'

export function useCooldown(ms = 1500) {
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** Runs `action` unless still cooling down. Returns false when it was blocked. */
  function run(action: () => void) {
    if (busy) return false
    action()
    setBusy(true)
    timer.current = window.setTimeout(() => setBusy(false), ms)
    return true
  }

  return { busy, run }
}
