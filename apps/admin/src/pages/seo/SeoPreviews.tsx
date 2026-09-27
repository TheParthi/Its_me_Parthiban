import type { Seo } from '@pg/shared'
import { ImageOff } from 'lucide-react'
import { Card, Skeleton } from '../../components/ui'
import { cn } from '../../lib/format'
import { useMediaAsset } from '../../lib/queries'

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || 'example.com'
  }
}

function crumbs(url: string) {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    return [u.origin, ...parts].join(' › ')
  } catch {
    return url
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Approximation of a Google desktop result. */
export function GooglePreview({ seo }: { seo: Seo }) {
  const url = seo.canonicalUrl || seo.siteUrl
  return (
    <Card>
      <p className="eyebrow mb-3">Google result preview</p>
      <div className="rounded-lg bg-white p-4 font-[arial,sans-serif]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f3f4] text-[11px] font-bold text-[#5f6368]">{hostOf(url).charAt(0).toUpperCase()}</span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] text-[#202124]">{hostOf(url)}</p>
            <p className="truncate text-[12px] text-[#4d5156]">{crumbs(url)}</p>
          </div>
        </div>
        <p className="mt-1.5 text-[20px] leading-snug text-[#1a0dab] hover:underline">{clip(seo.title || 'Untitled page', 60)}</p>
        <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">{seo.description ? clip(seo.description, 160) : <em>No meta description — Google will pick text from the page.</em>}</p>
      </div>
      {!seo.robotsIndex && <p className="mt-2 text-xs text-amber-300">“Allow indexing” is off, so this page will not appear in search results.</p>}
    </Card>
  )
}

/** Link card as shown by X / LinkedIn / Slack from the Open Graph tags. */
export function SocialPreview({ seo }: { seo: Seo }) {
  const img = useMediaAsset(seo.ogImageId)
  const title = seo.ogTitle || seo.title
  const desc = seo.ogDescription || seo.description
  const large = seo.twitterCard === 'summary_large_image'
  const image = seo.ogImageId ? (
    img.isLoading ? (
      <Skeleton className="h-full w-full rounded-none" />
    ) : img.data ? (
      <img src={img.data.url} alt="" className="h-full w-full object-cover" />
    ) : (
      <div className="grid h-full w-full place-items-center bg-[#1b2030] text-dim">
        <ImageOff className="h-5 w-5" aria-hidden />
      </div>
    )
  ) : (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1b2030] to-[#0f121a] px-3 text-center text-[11px] text-dim">No share image</div>
  )
  return (
    <Card>
      <p className="eyebrow mb-3">Social share card · {large ? 'large image' : 'summary'}</p>
      <div className={cn('overflow-hidden rounded-xl border border-line-2 bg-[#15181f]', !large && 'flex')}>
        <div className={cn('shrink-0 overflow-hidden', large ? 'aspect-[1200/630] w-full' : 'aspect-square w-28 border-r border-line-2')}>{image}</div>
        <div className="min-w-0 space-y-0.5 px-3.5 py-3">
          <p className="truncate text-[12px] text-dim">{hostOf(seo.siteUrl)}</p>
          <p className="line-clamp-2 text-[14px] font-semibold text-fg">{title || 'Untitled'}</p>
          <p className="line-clamp-2 text-[13px] text-muted">{desc}</p>
        </div>
      </div>
    </Card>
  )
}
