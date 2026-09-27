import type { Appearance, FontPreset } from '@pg/shared'
import { setMotionPreference } from '../lib/motion'
import { DEFAULT_APPEARANCE, FONT_PRESETS, PRELOADED_FONTS } from './defaults'

const HEX = /^#[0-9a-f]{6}$/i

/** appearance.colors key → Tailwind theme variable in index.css. */
const COLOR_VARS: Record<keyof Appearance['colors'], string> = {
  background: '--color-ink',
  surface: '--color-ink-2',
  surfaceRaised: '--color-ink-3',
  text: '--color-fg',
  textMuted: '--color-mute',
  accent: '--color-violet',
  accentSecondary: '--color-cyan',
  border: '--color-line',
}

const FONT_VARS: Record<keyof Appearance['typography'], string> = {
  display: '--font-display',
  body: '--font-sans',
  mono: '--font-mono',
}

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

const isPreset = (v: unknown): v is FontPreset => typeof v === 'string' && Object.prototype.hasOwnProperty.call(FONT_PRESETS, v)

function loadGoogleFont(preset: FontPreset) {
  if (PRELOADED_FONTS.includes(preset)) return
  const id = `gf-${preset}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  // Only ever built from the fixed preset table — never from free text.
  link.href = `https://fonts.googleapis.com/css2?family=${FONT_PRESETS[preset].google}&display=swap`
  document.head.appendChild(link)
}

/**
 * Applies validated design tokens at runtime by overriding the CSS custom
 * properties the Tailwind theme reads. Values equal to the defaults are left
 * to the stylesheet, so the default appearance renders byte-for-byte as the
 * static site (the stylesheet's translucent border colour, for example).
 */
export function applyAppearance(a: Appearance) {
  const root = document.documentElement
  const style = root.style

  for (const key of Object.keys(COLOR_VARS) as (keyof Appearance['colors'])[]) {
    const v = a.colors?.[key]
    const def = DEFAULT_APPEARANCE.colors[key]
    if (typeof v === 'string' && HEX.test(v) && v.toLowerCase() !== def.toLowerCase()) style.setProperty(COLOR_VARS[key], v)
    else style.removeProperty(COLOR_VARS[key])
  }
  // Secondary tokens that follow the primary ones when they change.
  const accent = style.getPropertyValue('--color-violet')
  if (accent) {
    style.setProperty('--grad-mid', `color-mix(in srgb, ${accent} 55%, white)`)
    style.setProperty('--selection', `color-mix(in srgb, ${accent} 45%, transparent)`)
  } else {
    style.removeProperty('--grad-mid')
    style.removeProperty('--selection')
  }
  const border = style.getPropertyValue('--color-line')
  if (border) style.setProperty('--color-line-2', `color-mix(in srgb, ${border} 70%, white)`)
  else style.removeProperty('--color-line-2')

  const bg = HEX.test(a.colors?.background ?? '') ? a.colors.background : DEFAULT_APPEARANCE.colors.background
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)

  for (const key of Object.keys(FONT_VARS) as (keyof Appearance['typography'])[]) {
    const preset = a.typography?.[key]
    if (isPreset(preset) && preset !== DEFAULT_APPEARANCE.typography[key]) {
      loadGoogleFont(preset)
      style.setProperty(FONT_VARS[key], FONT_PRESETS[preset].family)
    } else style.removeProperty(FONT_VARS[key])
  }

  const scale = typeof a.headingScale === 'number' && a.headingScale >= 0.8 && a.headingScale <= 1.25 ? a.headingScale : 1
  if (scale === 1) style.removeProperty('--heading-scale')
  else style.setProperty('--heading-scale', String(scale))

  root.dataset.radius = pick(a.radius, ['sharp', 'soft', 'round'] as const, 'round')
  root.dataset.button = pick(a.buttonStyle, ['pill', 'rounded', 'square'] as const, 'pill')
  root.dataset.sectionSpacing = pick(a.sectionSpacing, ['compact', 'normal', 'spacious'] as const, 'normal')
  root.dataset.nav = pick(a.navStyle, ['floating', 'solid'] as const, 'floating')
  root.dataset.grain = a.showGrain === false ? 'off' : 'on'
  setMotionPreference(pick(a.motion, ['full', 'reduced', 'off'] as const, 'full'))
}
