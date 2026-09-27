import { useId } from 'react'
import type { Appearance, FontPreset } from '@pg/shared'
import { Card, CardHeader, Select, Switch } from '../../components/ui'
import { fontFamily, fontOptions } from './fonts'

type Set = (path: (string | number)[], v: unknown) => void

const FONT_ROLES: { key: keyof Appearance['typography']; label: string; sample: string }[] = [
  { key: 'display', label: 'Display (headings)', sample: 'Engineering calm systems.' },
  { key: 'body', label: 'Body', sample: 'I design and build reliable products, from the database to the pixel.' },
  { key: 'mono', label: 'Mono (labels, code)', sample: 'const latency = 42 // ms' },
]

export function TypographyPanel({ value, set, disabled }: { value: Appearance; set: Set; disabled?: boolean }) {
  const sliderId = useId()
  return (
    <Card>
      <CardHeader title="Typography" description="Fonts load from Google Fonts on the public site." />
      <fieldset disabled={disabled} className="space-y-4">
        {FONT_ROLES.map((r) => (
          <div key={r.key} className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-end">
            <Select label={r.label} value={value.typography[r.key]} onChange={(v: FontPreset) => set(['typography', r.key], v)} options={fontOptions} />
            <p
              className="truncate rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-fg"
              style={{ fontFamily: fontFamily(value.typography[r.key]), fontSize: r.key === 'display' ? 20 : 14, fontWeight: r.key === 'display' ? 600 : 400 }}
              aria-label={`${r.label} sample`}
            >
              {r.sample}
            </p>
          </div>
        ))}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor={sliderId} className="text-[13px] font-medium text-[#d5d9e1]">
              Heading scale
            </label>
            <span className="font-mono text-xs text-muted">{value.headingScale.toFixed(2)}×</span>
          </div>
          <input
            id={sliderId}
            type="range"
            min={0.8}
            max={1.25}
            step={0.01}
            value={value.headingScale}
            onChange={(e) => set(['headingScale'], Math.round(Number(e.target.value) * 100) / 100)}
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-dim">
            <span>0.80</span>
            <span>1.00</span>
            <span>1.25</span>
          </div>
        </div>
      </fieldset>
    </Card>
  )
}

export function LayoutPanel({ value, set, disabled }: { value: Appearance; set: Set; disabled?: boolean }) {
  return (
    <Card>
      <CardHeader title="Shape, layout & motion" />
      <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Corner radius"
          value={value.radius}
          onChange={(v) => set(['radius'], v)}
          options={[
            { value: 'sharp', label: 'Sharp' },
            { value: 'soft', label: 'Soft' },
            { value: 'round', label: 'Round' },
          ]}
        />
        <Select
          label="Button style"
          value={value.buttonStyle}
          onChange={(v) => set(['buttonStyle'], v)}
          options={[
            { value: 'pill', label: 'Pill' },
            { value: 'rounded', label: 'Rounded' },
            { value: 'square', label: 'Square' },
          ]}
        />
        <Select
          label="Section spacing"
          value={value.sectionSpacing}
          onChange={(v) => set(['sectionSpacing'], v)}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'normal', label: 'Normal' },
            { value: 'spacious', label: 'Spacious' },
          ]}
        />
        <Select
          label="Navigation"
          value={value.navStyle}
          onChange={(v) => set(['navStyle'], v)}
          options={[
            { value: 'floating', label: 'Floating pill' },
            { value: 'solid', label: 'Solid bar' },
          ]}
        />
        <Select
          label="Motion"
          value={value.motion}
          onChange={(v) => set(['motion'], v)}
          hint="Visitors who prefer reduced motion always get reduced motion."
          options={[
            { value: 'full', label: 'Full' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'off', label: 'Off' },
          ]}
        />
      </fieldset>
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <Switch checked={value.showGrain} onChange={(v) => set(['showGrain'], v)} disabled={disabled} label="Film grain overlay" description="A subtle noise texture over the background." />
        <Switch checked={value.show3dHero} onChange={(v) => set(['show3dHero'], v)} disabled={disabled} label="3D hero scene" description="The interactive WebGL scene behind the hero. Off saves battery on phones." />
      </div>
    </Card>
  )
}
