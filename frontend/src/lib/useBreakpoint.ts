import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Matches Tailwind lg (1024px) — below = drawer sidebar + hamburger */
export const DRAWER_MAX_WIDTH = 1023

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export function isDrawerViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= DRAWER_MAX_WIDTH
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(getBreakpoint)

  useEffect(() => {
    const update = () => setBp(getBreakpoint())
    window.addEventListener('resize', update)
    const mq = window.matchMedia(`(max-width: ${DRAWER_MAX_WIDTH}px)`)
    mq.addEventListener('change', update)
    return () => {
      window.removeEventListener('resize', update)
      mq.removeEventListener('change', update)
    }
  }, [])

  return bp
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile'
}

export function useIsDrawerMode(): boolean {
  const bp = useBreakpoint()
  return bp === 'mobile' || bp === 'tablet'
}
