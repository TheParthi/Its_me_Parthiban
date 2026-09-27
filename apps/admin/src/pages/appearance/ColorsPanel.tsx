import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import type { Appearance } from '@pg/shared'
import type { FieldErrors } from '../../lib/forms'
import { cn, contrastRatio } from '../../lib/format'
import { Card, CardHeader, ColorInput } from '../../components/ui'

type ColorKey = keyof Appearance['colors']

const COLORS: { key: ColorKey; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'Page background' },
  { key: 'surface', label: 'Surface', hint: 'Cards and panels' },
  { key: 'surfaceRaised', label: 'Raised surface', hint: 'Hover states, popovers' },
  { key: 'border', label: 'Border', hint: 'Dividers and outlines' },
  { key: 'text', label: 'Text', hint: 'Headings and body copy' },
  { key: 'textMuted', label: 'Muted text', hint: 'Secondary copy, captions' },
  { key: 'accent', label: 'Accent', hint: 'Primary buttons, links' },
  { key: 'accentSecondary', label: 'Secondary accent', hint: 'Highlights, gradients' },
]

const PAIRS: { fg: ColorKey; bg: ColorKey; label: string }[] = [
  { fg: 'text', bg: 'background', label: 'Text on background' },
  { fg: 'textMuted', bg: 'background', label: 'Muted text on background' },
  { fg: 'text', bg: 'surface', label: 'Text on surface' },
  { fg: 'textMuted', bg: 'surface', label: 'Muted text on surface' },
]

function grade(r: number | null) {
  if (r == null) return { label: 'Invalid colour', tone: 'text-rose-300', icon: CircleAlert }
  if (r >= 7) return { label: 'AAA', tone: 'text-emerald-300', icon: CircleCheck }
  if (r >= 4.5) return { label: 'AA', tone: 'text-emerald-300', icon: CircleCheck }
  if (r >= 3) return { label: 'Large text only', tone: 'text-amber-300', icon: TriangleAlert }
  return { label: 'Fails — hard to read', tone: 'text-rose-300', icon: CircleAlert }
}

export function ColorsPanel({ colors, onChange, errors, disabled }: { colors: Appearance['colors']; onChange: (k: ColorKey, v: string) => void; errors: FieldErrors; disabled?: boolean }) {
  return (
    <Card>
      <CardHeader title="Colours" description="Validated design tokens — the site never accepts raw CSS." />
      <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
        {COLORS.map((c) => (
          <ColorInput key={c.key} label={c.label} hint={c.hint} value={colors[c.key]} error={errors[`colors.${c.key}`]} onChange={(v) => onChange(c.key, v)} />
        ))}
      </fieldset>
      <div className="mt-5 border-t border-line pt-4">
        <h3 className="eyebrow mb-2">Contrast (WCAG 2.1)</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PAIRS.map((p) => {
            const r = contrastRatio(colors[p.fg], colors[p.bg])
            const g = grade(r)
            const Icon = g.icon
            return (
              <li key={`${p.fg}-${p.bg}`} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                <span className="grid h-10 w-12 shrink-0 place-items-center rounded-md border border-line-2 font-display text-base font-semibold" style={{ background: colors[p.bg], color: colors[p.fg] }} aria-hidden>
                  Aa
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-fg">{p.label}</span>
                  <span className={cn('mt-0.5 inline-flex items-center gap-1 text-xs', g.tone)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-mono">{r ? `${r.toFixed(2)}:1` : '—'}</span> · {g.label}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Body text needs at least 4.5:1; large headings at least 3:1.</p>
      </div>
    </Card>
  )
}
