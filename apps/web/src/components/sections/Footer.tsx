import { ArrowUp } from 'lucide-react'
import { useContent } from '../../content/context'
import { safeHref } from '../../content/format'
import { useNavItems } from '../../content/sections'
import { scrollToId } from '../../lib/scroll'
import { GitHubIcon, LinkedInIcon, Monogram } from '../ui/Icons'
import { Magnetic } from '../ui/Magnetic'

export function Footer() {
  const { bundle } = useContent()
  const profile = bundle.profile
  const navItems = useNavItems()
  const github = safeHref(profile.links.github)
  const linkedin = safeHref(profile.links.linkedin)
  return (
    <footer className="relative border-t border-line px-5 pb-10 pt-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_auto]">
          <div className="flex items-start gap-4">
            <Monogram size={48} />
            <div>
              <div className="font-display text-xl font-semibold">{profile.fullName}</div>
              <p className="mt-1 text-sm text-mute">Designed and engineered with curiosity.</p>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {navItems.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToId(n.id)
                    }}
                    className="text-mute transition-colors hover:text-fg"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-start gap-2">
            {github && (
              <a href={github} target="_blank" rel="noopener" aria-label="GitHub" data-ev="GITHUB_CLICK" data-ev-target="footer" className="grid h-11 w-11 place-items-center rounded-full border border-line text-mute transition-colors hover:border-line-2 hover:text-fg">
                <GitHubIcon />
              </a>
            )}
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noopener" aria-label="LinkedIn" data-ev="LINKEDIN_CLICK" data-ev-target="footer" className="grid h-11 w-11 place-items-center rounded-full border border-line text-mute transition-colors hover:border-line-2 hover:text-fg">
                <LinkedInIcon />
              </a>
            )}
            <Magnetic>
              <button
                type="button"
                onClick={() => scrollToId('home')}
                aria-label="Back to top"
                className="group grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-fg text-ink"
              >
                <ArrowUp className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-8" />
                <ArrowUp className="absolute h-4 w-4 translate-y-8 transition-transform duration-500 ease-out-expo group-hover:translate-y-0" />
              </button>
            </Magnetic>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 font-mono text-[11px] text-dim">
          <span>© {new Date().getFullYear()} {profile.fullName}</span>
          {profile.tagline && <span>{profile.tagline}</span>}
        </div>
      </div>
    </footer>
  )
}
