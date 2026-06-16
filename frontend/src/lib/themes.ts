export type ColorThemeId = 'descon' | 'ocean' | 'forest' | 'slate' | 'sunset'

type ThemeVars = Record<string, string>

export interface ColorTheme {
  id: ColorThemeId
  name: string
  description: string
  swatch: [string, string, string]
  light: ThemeVars
  dark: ThemeVars
}

const baseLight: ThemeVars = {
  background: '220 20% 97%',
  foreground: '224 71% 4%',
  card: '0 0% 100%',
  'card-foreground': '224 71% 4%',
  secondary: '220 14% 96%',
  'secondary-foreground': '220 9% 46%',
  muted: '220 14% 96%',
  'muted-foreground': '220 9% 46%',
  destructive: '0 84% 60%',
  border: '220 13% 91%',
  input: '220 13% 91%',
  success: '142 76% 36%',
  warning: '38 92% 50%',
}

const baseDark: ThemeVars = {
  background: '224 71% 4%',
  foreground: '213 31% 91%',
  card: '224 71% 7%',
  'card-foreground': '213 31% 91%',
  secondary: '215 28% 17%',
  'secondary-foreground': '213 31% 91%',
  muted: '215 28% 17%',
  'muted-foreground': '215 20% 65%',
  destructive: '0 63% 51%',
  border: '215 28% 17%',
  input: '215 28% 17%',
  success: '142 71% 45%',
  warning: '38 92% 50%',
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'descon',
    name: 'Descon',
    description: 'Corporate red with blue accents',
    swatch: ['#E31E24', '#2A6EBB', '#F4F6F9'],
    light: {
      ...baseLight,
      primary: '358 79% 51%',
      'primary-foreground': '0 0% 100%',
      accent: '212 63% 45%',
      'accent-foreground': '210 20% 98%',
      ring: '358 79% 51%',
    },
    dark: {
      ...baseDark,
      primary: '358 79% 55%',
      'primary-foreground': '0 0% 100%',
      accent: '212 63% 50%',
      'accent-foreground': '210 20% 98%',
      ring: '358 79% 55%',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue with teal highlights',
    swatch: ['#0E7490', '#06B6D4', '#F0F9FF'],
    light: {
      ...baseLight,
      primary: '199 89% 35%',
      'primary-foreground': '0 0% 100%',
      accent: '187 85% 43%',
      'accent-foreground': '0 0% 100%',
      ring: '199 89% 35%',
    },
    dark: {
      ...baseDark,
      background: '210 50% 6%',
      card: '210 45% 9%',
      primary: '199 80% 45%',
      'primary-foreground': '0 0% 100%',
      accent: '187 75% 50%',
      'accent-foreground': '210 50% 6%',
      ring: '199 80% 45%',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural greens for calm focus',
    swatch: ['#15803D', '#65A30D', '#F7F9F5'],
    light: {
      ...baseLight,
      background: '120 20% 97%',
      primary: '142 71% 35%',
      'primary-foreground': '0 0% 100%',
      accent: '84 65% 38%',
      'accent-foreground': '0 0% 100%',
      ring: '142 71% 35%',
    },
    dark: {
      ...baseDark,
      background: '150 30% 5%',
      card: '150 25% 8%',
      primary: '142 65% 42%',
      'primary-foreground': '0 0% 100%',
      accent: '84 55% 45%',
      'accent-foreground': '150 30% 5%',
      ring: '142 65% 42%',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral slate with indigo accents',
    swatch: ['#475569', '#6366F1', '#F8FAFC'],
    light: {
      ...baseLight,
      primary: '215 20% 40%',
      'primary-foreground': '0 0% 100%',
      accent: '239 84% 67%',
      'accent-foreground': '0 0% 100%',
      ring: '239 84% 67%',
    },
    dark: {
      ...baseDark,
      background: '222 47% 6%',
      card: '222 40% 9%',
      primary: '215 20% 55%',
      'primary-foreground': '222 47% 6%',
      accent: '239 84% 67%',
      'accent-foreground': '0 0% 100%',
      ring: '239 84% 67%',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm amber and coral tones',
    swatch: ['#EA580C', '#F43F5E', '#FFF7ED'],
    light: {
      ...baseLight,
      background: '30 40% 98%',
      primary: '24 95% 48%',
      'primary-foreground': '0 0% 100%',
      accent: '350 89% 60%',
      'accent-foreground': '0 0% 100%',
      ring: '24 95% 48%',
    },
    dark: {
      ...baseDark,
      background: '20 30% 6%',
      card: '20 25% 9%',
      primary: '24 90% 52%',
      'primary-foreground': '0 0% 100%',
      accent: '350 80% 58%',
      'accent-foreground': '0 0% 100%',
      ring: '24 90% 52%',
    },
  },
]

export const DEFAULT_COLOR_THEME: ColorThemeId = 'descon'

export function getColorTheme(id: ColorThemeId): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0]
}

export function applyColorTheme(themeId: ColorThemeId, darkMode: boolean) {
  const theme = getColorTheme(themeId)
  const vars = darkMode ? theme.dark : theme.light
  const root = document.documentElement

  root.setAttribute('data-theme', themeId)
  root.classList.toggle('dark', darkMode)

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(`--${key}`, value)
  }
}
