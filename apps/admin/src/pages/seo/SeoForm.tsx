import type { Seo } from '@pg/shared'
import { ImageUploader } from '../../components/media/ImageUploader'
import { FieldRow, FormSection } from '../../components/profile/FormSection'
import { Input, Select, Switch, Textarea } from '../../components/ui'

interface Props {
  s: Seo
  set: (path: (string | number)[], v: unknown) => void
  err: (path: string) => string | undefined
  disabled: boolean
}

export function SeoForm({ s, set, err, disabled }: Props) {
  return (
    <div className="space-y-5">
      <FormSection title="Search appearance" description="The page title and description search engines show for your homepage.">
        <Input
          label="Site URL"
          required
          type="url"
          placeholder="https://example.com/"
          hint="The public address of the site. Used for the sitemap and absolute links."
          value={s.siteUrl}
          onChange={(e) => set(['siteUrl'], e.target.value)}
          error={err('siteUrl')}
          disabled={disabled}
        />
        <Input label="Title" required maxLength={70} showCount hint="Aim for 50–60 characters." value={s.title} onChange={(e) => set(['title'], e.target.value)} error={err('title')} disabled={disabled} />
        <Textarea
          label="Meta description"
          maxLength={170}
          rows={3}
          hint="Aim for 120–160 characters."
          value={s.description}
          onChange={(e) => set(['description'], e.target.value)}
          error={err('description')}
          disabled={disabled}
        />
        <Input
          label="Canonical URL"
          type="url"
          placeholder="Defaults to the site URL"
          hint="Tells search engines which address is the original when the site is reachable at several."
          value={s.canonicalUrl ?? ''}
          onChange={(e) => set(['canonicalUrl'], e.target.value)}
          error={err('canonicalUrl')}
          disabled={disabled}
        />
      </FormSection>

      <FormSection title="Social sharing" description="Open Graph and Twitter tags used when a link to the site is shared. Empty fields fall back to the title and description.">
        <Input label="Share title" maxLength={90} showCount value={s.ogTitle} onChange={(e) => set(['ogTitle'], e.target.value)} error={err('ogTitle')} disabled={disabled} />
        <Textarea label="Share description" maxLength={200} rows={3} value={s.ogDescription} onChange={(e) => set(['ogDescription'], e.target.value)} error={err('ogDescription')} disabled={disabled} />
        <FieldRow>
          <ImageUploader
            label="Share image"
            hint="1200×630 px. Cropped to that size before upload."
            value={s.ogImageId}
            onChange={(id) => set(['ogImageId'], id)}
            category="OTHER"
            aspect="og"
            aspects={['og']}
            previewClassName="aspect-[1200/630]"
            alt="Share image"
            error={err('ogImageId')}
            disabled={disabled}
          />
          <Select
            label="Twitter / X card"
            value={s.twitterCard}
            onChange={(v) => set(['twitterCard'], v)}
            options={[
              { value: 'summary_large_image', label: 'Large image' },
              { value: 'summary', label: 'Summary (small square image)' },
            ]}
            hint="How the card looks when a link is posted on X."
            error={err('twitterCard')}
            disabled={disabled}
          />
        </FieldRow>
      </FormSection>

      <FormSection title="Crawling & structured data">
        <Switch
          label="Allow indexing"
          description="Adds index to the robots meta tag. Turn off to keep the site out of search results (noindex) — useful while it is private or unfinished."
          checked={s.robotsIndex}
          onChange={(v) => set(['robotsIndex'], v)}
          disabled={disabled}
        />
        <Switch
          label="Allow following links"
          description="Lets crawlers follow links on your pages (follow). When off, nofollow asks them not to pass ranking to linked sites."
          checked={s.robotsFollow}
          onChange={(v) => set(['robotsFollow'], v)}
          disabled={disabled}
        />
        <Switch
          label="Structured data (JSON-LD)"
          description="Adds a schema.org Person/WebSite description so search engines can show richer results."
          checked={s.structuredData}
          onChange={(v) => set(['structuredData'], v)}
          disabled={disabled}
        />
      </FormSection>
    </div>
  )
}
