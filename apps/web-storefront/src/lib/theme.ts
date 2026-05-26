const ACCENT_COLORS: Record<string, string> = {
  forest: '#0F766E',
  emerald: '#00B383',
  mint: '#10B981',
  lime: '#65A30D',
  ocean: '#0284C7',
  sky: '#0EA5E9',
  indigo: '#4F46E5',
  sunset: '#EA580C',
  coral: '#E11D48',
  rose: '#DB2777',
  graphite: '#1F2937',
  sand: '#B45309',
}

export function getAccentColor(name: string): string {
  // If it looks like a hex color already, return it directly
  if (name && name.startsWith('#')) return name
  return ACCENT_COLORS[name] ?? ACCENT_COLORS.emerald
}

export function getAccentSoft(name: string): string {
  const hex = getAccentColor(name)
  return hex + '20' // ~12% opacity
}

export function getAccentDark(name: string): string {
  // A slightly darker variant for hover states — just drop 10% brightness via opacity
  const hex = getAccentColor(name)
  return hex + 'CC' // ~80% opacity
}
