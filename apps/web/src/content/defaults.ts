import type { Appearance, FontPreset } from '@pg/shared'

// Runtime copies of DEFAULT_APPEARANCE / FONT_PRESETS from @pg/shared.
// Importing values from the shared package would pull every zod schema into
// the first-paint bundle (the package is not marked side-effect free), so the
// portfolio keeps these two small constants locally and only imports *types*
// from @pg/shared. `satisfies` keeps them in sync at compile time.

export const DEFAULT_APPEARANCE = {
  colors: {
    background: '#08090D',
    surface: '#101218',
    surfaceRaised: '#161923',
    text: '#F5F7FA',
    textMuted: '#969BA8',
    accent: '#8B5CF6',
    accentSecondary: '#00E5FF',
    border: '#24262E',
  },
  typography: { display: 'space-grotesk', body: 'inter', mono: 'jetbrains-mono' },
  headingScale: 1,
  radius: 'round',
  buttonStyle: 'pill',
  sectionSpacing: 'normal',
  navStyle: 'floating',
  motion: 'full',
  showGrain: true,
  show3dHero: true,
} satisfies Appearance as Appearance

/** Preset → CSS family + Google Fonts query. Never built from free text. */
export const FONT_PRESETS: Record<FontPreset, { label: string; family: string; google: string }> = {
  'space-grotesk': {
    label: 'Space Grotesk',
    family: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    google: 'Space+Grotesk:wght@400;500;600;700',
  },
  inter: { label: 'Inter', family: "'Inter', ui-sans-serif, system-ui, sans-serif", google: 'Inter:wght@400;500;600' },
  sora: { label: 'Sora', family: "'Sora', ui-sans-serif, system-ui, sans-serif", google: 'Sora:wght@400;500;600;700' },
  manrope: { label: 'Manrope', family: "'Manrope', ui-sans-serif, system-ui, sans-serif", google: 'Manrope:wght@400;500;600;700' },
  'ibm-plex-sans': {
    label: 'IBM Plex Sans',
    family: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    google: 'IBM+Plex+Sans:wght@400;500;600;700',
  },
  'jetbrains-mono': {
    label: 'JetBrains Mono',
    family: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    google: 'JetBrains+Mono:wght@400;500',
  },
}

/** Fonts index.html already loads. */
export const PRELOADED_FONTS: FontPreset[] = ['space-grotesk', 'inter', 'jetbrains-mono']

/** The resume bundled with the static site (public/). */
export const BUNDLED_RESUME = 'Parthiban_Gunasekaran_Resume.pdf'
