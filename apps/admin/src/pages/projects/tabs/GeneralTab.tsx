import { Wand2 } from 'lucide-react'
import { PREVIEW_STYLES } from '@pg/shared'
import { Card, ColorInput, Input, Segmented, SectionTitle, Select, Switch } from '../../../components/ui'
import { slugify } from '../../../lib/format'
import { PREVIEW_STYLE_INFO, type TabProps } from '../projectModel'

/** YYYY-MM for <input type="month"> (accepts stored YYYY-MM-DD too). */
const toMonth = (v: string | null | undefined) => (v ? v.slice(0, 7) : '')

export function GeneralTab({ value: v, set, errors, disabled }: TabProps) {
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)
  const dateOrder = v.startDate && v.endDate && toMonth(v.endDate) < toMonth(v.startDate) ? 'End is before start' : null
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="space-y-5">
        <SectionTitle description="How the project is named and addressed.">Identity</SectionTitle>
        <Input label="Title" required maxLength={80} showCount value={v.title} onChange={(e) => set('title', e.target.value)} error={errors.title} disabled={disabled} />
        <Input
          label="Slug"
          required
          maxLength={80}
          value={v.slug}
          onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          error={errors.slug}
          hint={slugOk ? `Link: /projects/${v.slug}` : undefined}
          leading={<span className="font-mono text-xs">/</span>}
          className="font-mono"
          disabled={disabled}
          labelAction={
            <button
              type="button"
              disabled={disabled || !v.title || slugify(v.title) === v.slug}
              onClick={() => set('slug', slugify(v.title))}
              className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 disabled:opacity-40"
            >
              <Wand2 className="h-3 w-3" /> Generate from title
            </button>
          }
        />
        <Input
          label="Full title"
          maxLength={200}
          showCount
          value={v.fullTitle ?? ''}
          onChange={(e) => set('fullTitle', e.target.value)}
          error={errors.fullTitle}
          hint="Optional longer name shown in the project detail view."
          disabled={disabled}
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Category" maxLength={120} value={v.category} onChange={(e) => set('category', e.target.value)} error={errors.category} disabled={disabled} />
          <Input
            label="Status label"
            maxLength={80}
            value={v.statusLabel ?? ''}
            onChange={(e) => set('statusLabel', e.target.value)}
            error={errors.statusLabel}
            placeholder="e.g. Live on Google Play"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Start"
            type="month"
            value={toMonth(v.startDate)}
            onChange={(e) => set('startDate', e.target.value || null)}
            error={errors.startDate}
            disabled={disabled}
          />
          <Input
            label="End"
            type="month"
            value={toMonth(v.endDate)}
            onChange={(e) => set('endDate', e.target.value || null)}
            error={errors.endDate ?? dateOrder}
            hint="Leave empty for ongoing work."
            disabled={disabled}
          />
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="space-y-5">
          <SectionTitle>Visibility</SectionTitle>
          <Switch
            label="Featured"
            description="Highlighted on the homepage projects section."
            checked={v.featured}
            onChange={(c) => set('featured', c)}
            disabled={disabled}
          />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#d5d9e1]">Listing</p>
            <Segmented
              aria-label="Visibility"
              value={v.visibility}
              onChange={(x) => set('visibility', x)}
              options={[
                { value: 'PUBLIC', label: 'Public', title: 'Listed on the portfolio' },
                { value: 'UNLISTED', label: 'Unlisted', title: 'Reachable by link only' },
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">{v.visibility === 'PUBLIC' ? 'Listed in the portfolio once published.' : 'Published but hidden from lists — reachable by direct link.'}</p>
          </div>
        </Card>
        <Card className="space-y-5">
          <SectionTitle description="The project card’s visual.">Appearance</SectionTitle>
          <ColorInput label="Accent colour" value={v.accent} onChange={(c) => set('accent', c)} error={errors.accent} />
          <Select
            label="Preview style"
            value={v.previewStyle}
            onChange={(x) => set('previewStyle', x)}
            options={PREVIEW_STYLES.map((s) => ({ value: s, label: PREVIEW_STYLE_INFO[s].label }))}
            error={errors.previewStyle}
            hint={PREVIEW_STYLE_INFO[v.previewStyle].description}
            disabled={disabled}
          />
        </Card>
      </div>
    </div>
  )
}
