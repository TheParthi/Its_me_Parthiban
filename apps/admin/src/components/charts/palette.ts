/**
 * Chart palette for the dark dashboard. Categorical hues are assigned in this
 * fixed order (never cycled past the end — extra categories fold into
 * "Other"). Violet leads, cyan second (brand). Checked with the dataviz
 * validator against the card surface #151923: contrast and normal-vision
 * separation pass; the closest colour-blind pair sits in the 6–8 ΔE band, so
 * every chart also carries a legend or direct labels.
 */
export const PALETTE = ['#8B5CF6', '#00D5FF', '#D97706', '#EC4899', '#059669', '#3B82F6'] as const

export const OTHER_COLOR = '#5B6272'

export const CHART = {
  surface: '#151923',
  grid: 'rgba(255,255,255,0.06)',
  axis: 'rgba(255,255,255,0.12)',
  tick: '#9299a8',
  tickFont: 11,
  cursor: 'rgba(255,255,255,0.14)',
  hoverFill: 'rgba(255,255,255,0.04)',
} as const

export const colorAt = (i: number) => PALETTE[i] ?? OTHER_COLOR

export const axisTick = { fill: CHART.tick, fontSize: CHART.tickFont, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }

export interface SeriesDef {
  key: string
  label: string
  color?: string
}

/** Keep the first `max - 1` items and fold the rest into "Other". */
export function foldOther<T extends { key: string; count: number }>(items: T[], max = PALETTE.length): { key: string; count: number }[] {
  if (items.length <= max) return items
  const head = items.slice(0, max - 1)
  const rest = items.slice(max - 1).reduce((n, x) => n + x.count, 0)
  return [...head, { key: 'Other', count: rest }]
}
