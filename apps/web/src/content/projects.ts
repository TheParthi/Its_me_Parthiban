import type { PublicBundle, PublicProject } from '@pg/shared'
import { safeHref } from './format'

/**
 * Featured = homepage.featuredProjectIds (in that order) when set, otherwise
 * projects flagged featured, in CMS order. Archive = everything else, only
 * when homepage.showArchive.
 */
export function selectProjects(bundle: PublicBundle): { featured: PublicProject[]; archive: PublicProject[] } {
  const all = bundle.projects.filter((p) => p.visibility !== 'UNLISTED')
  const ids = bundle.homepage.featuredProjectIds
  let featured: PublicProject[]
  if (ids.length) {
    const byKey = new Map<string, PublicProject>()
    all.forEach((p) => {
      byKey.set(p.id, p)
      byKey.set(p.slug, p)
    })
    featured = [...new Set(ids.map((id) => byKey.get(id)).filter((p): p is PublicProject => !!p))]
  } else featured = all.filter((p) => p.featured)
  const set = new Set(featured)
  const archive = bundle.homepage.showArchive ? all.filter((p) => !set.has(p)) : []
  return { featured, archive }
}

export interface OutLink {
  label: string
  href: string
  /** Analytics target: 'repo' | 'demo' | 'video' | sanitised label. */
  target: string
}

/** Every outbound link of a project, deduplicated by URL. */
export function projectLinks(p: PublicProject): OutLink[] {
  const out: OutLink[] = []
  const seen = new Set<string>()
  const repo = safeHref(p.repoUrl)
  const demo = safeHref(p.demoUrl)
  const add = (label: string, href: string | undefined, target?: string) => {
    if (!href || !/^https?:\/\//i.test(href) || seen.has(href)) return
    seen.add(href)
    out.push({ label, href, target: target ?? (href === repo ? 'repo' : href === demo ? 'demo' : label) })
  }
  p.links.forEach((l) => add(l.label, safeHref(l.href)))
  add('Source', repo, 'repo')
  add('Live demo', demo, 'demo')
  add('Video', safeHref(p.videoUrl), 'video')
  return out
}

/** The single "View Project" link on a featured row. */
export const primaryLink = (p: PublicProject): OutLink | undefined => projectLinks(p)[0]
