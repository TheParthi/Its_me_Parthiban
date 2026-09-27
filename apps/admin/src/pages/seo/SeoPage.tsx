import { useState } from 'react'
import { ExternalLink, FileCode2 } from 'lucide-react'
import { seoSchema, type Seo } from '@pg/shared'
import { DocPublishControls, HistoryButton } from '../../components/profile/DocPublishControls'
import { useDocEditor } from '../../components/profile/useDocEditor'
import { Callout, Card, ErrorState, PageHeader, PageSkeleton } from '../../components/ui'
import { SeoForm } from './SeoForm'
import { GooglePreview, SocialPreview } from './SeoPreviews'

const EMPTY_SEO: Seo = {
  siteUrl: '',
  title: '',
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogImageId: null,
  canonicalUrl: '',
  robotsIndex: true,
  robotsFollow: true,
  twitterCard: 'summary_large_image',
  structuredData: true,
}

/** In dev the API runs on :4000; in production it is served from the same origin. */
function publicApiBase() {
  const { protocol, hostname, origin } = window.location
  return import.meta.env.DEV ? `${protocol}//${hostname}:4000/api/public` : `${origin}/api/public`
}

export default function SeoPage() {
  const editor = useDocEditor<Seo>('seo', seoSchema, EMPTY_SEO, {
    write: ['site:write'],
    publish: ['content:publish', 'site:write'],
  })
  const [history, setHistory] = useState(false)
  const { doc, form } = editor
  const base = publicApiBase()

  const header = (
    <PageHeader
      eyebrow="Site"
      title="SEO Settings"
      description="Control how the site appears in search results and when shared on social networks."
      actions={<HistoryButton onClick={() => setHistory(true)} />}
    />
  )

  if (doc.error) {
    return (
      <>
        {header}
        <ErrorState error={doc.error} onRetry={() => doc.refetch()} title="Could not load SEO settings" />
      </>
    )
  }
  if (doc.isLoading || !form.value) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    )
  }

  const s = form.value
  return (
    <>
      {header}
      {!editor.canSave && (
        <Callout tone="info" className="mb-4" title="Read-only">
          Editing SEO settings requires the site:write permission.
        </Callout>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 space-y-5">
          {editor.formError && (
            <Callout tone="danger" title="SEO settings could not be saved">
              {editor.formError}
            </Callout>
          )}
          <SeoForm s={s} set={form.set} err={(p) => form.errors[p]} disabled={!editor.canSave} />
        </div>
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="Previews">
          <GooglePreview seo={s} />
          <SocialPreview seo={s} />
          <Card>
            <p className="eyebrow mb-3">Crawler files</p>
            <p className="mb-3 text-xs text-muted">Generated from the published settings and content.</p>
            <div className="flex flex-col gap-2">
              {[
                ['sitemap.xml', 'Every published page, for search engines'],
                ['robots.txt', 'Crawling rules and the sitemap location'],
              ].map(([file, note]) => (
                <a
                  key={file}
                  href={`${base}/${file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 hover:border-line-2 hover:bg-white/[0.03]"
                >
                  <FileCode2 className="h-4 w-4 shrink-0 text-accent-2" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] text-fg">{file}</span>
                    <span className="block truncate text-xs text-muted">{note}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-dim group-hover:text-fg" aria-hidden />
                </a>
              ))}
            </div>
          </Card>
        </aside>
      </div>
      <DocPublishControls editor={editor} entityType="seo" entityId="SEO" label="SEO" historyOpen={history} onHistoryClose={() => setHistory(false)} />
    </>
  )
}
