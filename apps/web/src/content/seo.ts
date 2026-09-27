import type { PublicBundle } from '@pg/shared'

const safeHttp = (u: unknown): string | null => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null)

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!href) return
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Runtime SEO for crawlers that execute JavaScript. index.html keeps sensible
 * static defaults for those that don't. Structured data is serialised with
 * JSON.stringify into a script's textContent — never injected as HTML.
 */
export function applySeo(bundle: PublicBundle, opts: { preview: boolean }) {
  const { seo, profile } = bundle
  if (seo.title) document.title = seo.title
  if (seo.description) setMeta('name', 'description', seo.description)
  const canonical = safeHttp(seo.canonicalUrl) ?? safeHttp(seo.siteUrl)
  setCanonical(canonical)

  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:title', seo.ogTitle || seo.title || null)
  setMeta('property', 'og:description', seo.ogDescription || seo.description || null)
  if (canonical) setMeta('property', 'og:url', canonical)
  // Keep index.html's og.png unless the CMS provides an image.
  const ogImage = safeHttp(seo.ogImage?.url)
  if (ogImage) setMeta('property', 'og:image', ogImage)
  if (seo.ogImage?.alt) setMeta('property', 'og:image:alt', seo.ogImage.alt)
  setMeta('name', 'twitter:card', seo.twitterCard === 'summary' ? 'summary' : 'summary_large_image')

  const robots = opts.preview
    ? 'noindex, nofollow'
    : `${seo.robotsIndex === false ? 'noindex' : 'index'}, ${seo.robotsFollow === false ? 'nofollow' : 'follow'}`
  setMeta('name', 'robots', robots)
  setMeta('name', 'author', profile.fullName || null)

  const id = 'ld-json'
  document.getElementById(id)?.remove()
  if (seo.structuredData && !opts.preview) {
    const site = safeHttp(seo.siteUrl) ?? canonical ?? undefined
    const sameAs = [profile.links.github, profile.links.linkedin, profile.links.leetcode, ...profile.links.others.map((l) => l.href)]
      .map(safeHttp)
      .filter((u): u is string => !!u)
    const data = [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.fullName,
        jobTitle: profile.title || undefined,
        description: profile.shortBio || undefined,
        url: site,
        image: safeHttp(profile.photo?.url) ?? undefined,
        sameAs: sameAs.length ? sameAs : undefined,
        address: profile.showLocation && profile.location ? { '@type': 'PostalAddress', addressLocality: profile.location } : undefined,
      },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: seo.title, url: site, description: seo.description || undefined },
    ]
    const script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    // Escape "<" so the payload can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c')
    document.head.appendChild(script)
  }
}
