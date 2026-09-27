import { useEffect } from 'react'
import { FONT_PRESETS, type FontPreset } from '@pg/shared'

const WEIGHTS: Record<FontPreset, string> = {
  'space-grotesk': '400;500;600;700',
  inter: '400;500;600;700',
  sora: '400;500;600;700',
  manrope: '400;500;600;700',
  'ibm-plex-sans': '400;500;600;700',
  'jetbrains-mono': '400;500;700',
}

export const fontFamily = (p: FontPreset) => FONT_PRESETS[p].family
export const fontOptions = (Object.keys(FONT_PRESETS) as FontPreset[]).map((k) => ({ value: k, label: FONT_PRESETS[k].label }))

function href(p: FontPreset) {
  const name = FONT_PRESETS[p].label.replace(/ /g, '+')
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${WEIGHTS[p]}&display=swap`
}

/** Inject a Google Fonts stylesheet (once per preset) so previews render the real face. */
export function useGoogleFonts(presets: FontPreset[]) {
  const key = [...new Set(presets)].sort().join(',')
  useEffect(() => {
    for (const p of key.split(',') as FontPreset[]) {
      if (!p || !(p in FONT_PRESETS)) continue
      const id = `pg-font-${p}`
      if (document.getElementById(id)) continue
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = href(p)
      document.head.appendChild(link)
    }
  }, [key])
}
