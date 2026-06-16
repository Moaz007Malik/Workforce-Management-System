import { useMemo } from 'react'
import { useAppStore } from '@/stores/useAppStore'

function readHsl(variable: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return value ? `hsl(${value})` : ''
}

/** Resolved theme colors for charts and inline styles. Re-reads when theme or mode changes. */
export function useThemeColors() {
  const colorTheme = useAppStore((s) => s.colorTheme)
  const darkMode = useAppStore((s) => s.darkMode)

  return useMemo(
    () => ({
      primary: readHsl('--primary'),
      accent: readHsl('--accent'),
      primaryFill: readHsl('--primary') || 'hsl(358 79% 51%)',
      accentFill: readHsl('--accent') || 'hsl(212 63% 45%)',
      accentFillSoft: `${readHsl('--accent') || 'hsl(212 63% 45%)'}22`,
    }),
    [colorTheme, darkMode],
  )
}
