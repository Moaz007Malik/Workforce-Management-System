import { useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { applyColorTheme, DEFAULT_COLOR_THEME } from '@/lib/themes'

export function ThemeSync() {
  const colorTheme = useAppStore((s) => s.colorTheme ?? DEFAULT_COLOR_THEME)
  const darkMode = useAppStore((s) => s.darkMode)

  useEffect(() => {
    applyColorTheme(colorTheme, darkMode)
  }, [colorTheme, darkMode])

  return null
}
