import { Card, CardHeader, Input, Textarea } from '../../../components/ui'
import type { TabProps } from '../projectModel'

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function SeoTab({ value: v, set, errors, disabled }: TabProps) {
  const title = v.seoTitle || v.title || 'Untitled project'
  const desc = v.seoDescription || v.shortDescription || 'Add a description so search engines show something meaningful here.'
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="space-y-5">
        <CardHeader title="Search appearance" description="Leave empty to fall back to the title and short description." className="mb-0" />
        <Input
          label="SEO title"
          maxLength={70}
          showCount
          value={v.seoTitle ?? ''}
          onChange={(e) => set('seoTitle', e.target.value)}
          error={errors.seoTitle}
          placeholder={v.title}
          disabled={disabled}
        />
        <Textarea
          label="SEO description"
          maxLength={170}
          rows={3}
          value={v.seoDescription ?? ''}
          onChange={(e) => set('seoDescription', e.target.value)}
          error={errors.seoDescription}
          placeholder={v.shortDescription}
          disabled={disabled}
        />
      </Card>
      <Card>
        <CardHeader title="Google preview" description="Approximate — search engines may rewrite it." />
        <div className="rounded-lg bg-white p-4 font-[arial,sans-serif]" aria-label="Search result preview">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f1f3f4] text-[11px] font-bold text-[#5f6368]">{(v.title || 'P').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] text-[#202124]">Portfolio</p>
              <p className="truncate text-[12px] text-[#4d5156]">› projects › {v.slug || 'slug'}</p>
            </div>
          </div>
          <p className="mt-2 truncate text-[20px] leading-snug text-[#1a0dab]">{clip(title, 60)}</p>
          <p className="mt-1 line-clamp-2 text-[14px] leading-[1.58] text-[#4d5156]">{clip(desc, 160)}</p>
        </div>
      </Card>
    </div>
  )
}
