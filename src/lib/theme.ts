import type { ThemePreference } from './types'

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return dark ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePreference): 'light' | 'dark' {
  const resolved = resolveTheme(pref)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }
  return resolved
}

export function applyAccent(hue: number): void {
  const light = `hsl(${hue} 82% 52%)`
  const dark = `hsl(${hue} 82% 66%)`
  const softLight = `hsl(${hue} 82% 52% / 0.12)`
  const softDark = `hsl(${hue} 82% 66% / 0.14)`
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.style.setProperty('--accent-light', light)
    root.style.setProperty('--accent-dark', dark)
    root.style.setProperty('--accent-soft-light', softLight)
    root.style.setProperty('--accent-soft-dark', softDark)
  }
}
