import type { PublicProject } from '@pg/shared'
import { safeHref } from '../../content/format'

/**
 * Preview frame for projects without an animated illustration: the cover
 * image (or first screenshot); if neither exists, a typographic placeholder
 * in the project's accent colour.
 */
export function ImagePreview({ project }: { project: PublicProject }) {
  const media = project.cover ?? project.screenshots[0] ?? null
  const src = safeHref(media?.url)
  if (src)
    return (
      <img
        src={src}
        alt={media?.alt || `${project.title} preview`}
        width={media?.width ?? undefined}
        height={media?.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    )
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-ink-2" role="img" aria-label={`${project.title} placeholder`}>
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
      <div className="absolute h-2/3 w-2/3 rounded-full opacity-25 blur-[80px]" style={{ background: project.accent }} />
      <div className="relative text-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-dim">{project.category.toUpperCase()}</div>
        <div className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-6xl" style={{ color: project.accent }}>
          {project.title}
        </div>
      </div>
    </div>
  )
}
