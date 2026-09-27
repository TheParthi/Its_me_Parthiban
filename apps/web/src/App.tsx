import type { SectionType } from '@pg/shared'
import { MotionConfig } from 'framer-motion'
import { Component, useEffect, type ComponentType, type ReactNode } from 'react'
import { About } from './components/sections/About'
import { Achievements } from './components/sections/Achievements'
import { Contact } from './components/sections/Contact'
import { Education } from './components/sections/Education'
import { Experience } from './components/sections/Experience'
import { Exploring } from './components/sections/Exploring'
import { Footer } from './components/sections/Footer'
import { Hero } from './components/sections/Hero'
import { Lab } from './components/sections/Lab'
import { Nav } from './components/sections/Nav'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { Atmosphere } from './components/ui/Atmosphere'
import { ConsentBar, PreviewBadge } from './components/ui/Overlays'
import { useContent } from './content/context'
import { sectionViews } from './content/sections'
import { startAnalytics } from './lib/analytics'
import { useForcedReducedMotion } from './lib/motion'
import { startSmoothScroll } from './lib/scroll'

// Default narrative: introduction → identity → projects → engineering →
// skills → experience → now → contact. The CMS homepage config can reorder,
// hide or add (education, achievements) sections.
const SECTIONS: Partial<Record<SectionType, ComponentType>> = {
  hero: Hero,
  about: About,
  projects: Projects,
  lab: Lab,
  skills: Skills,
  experience: Experience,
  education: Education,
  achievements: Achievements,
  exploring: Exploring,
  contact: Contact,
}

/** If a CMS bundle ever fails to render, fall back to the static content instead of a blank page. */
class ContentBoundary extends Component<{ onError: () => void; canRecover: boolean; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Content failed to render; falling back to static content.', error)
    if (this.props.canRecover) this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Page() {
  const { bundle } = useContent()
  const views = sectionViews(bundle)
  const showFooter = views.some((v) => v.type === 'footer')
  return (
    <>
      <Atmosphere />
      <Nav />
      <main id="main" className="relative z-10">
        {views.map((v) => {
          const Section = SECTIONS[v.type]
          return Section ? <Section key={v.type} /> : null
        })}
      </main>
      {showFooter && <Footer />}
      <PreviewBadge />
      <ConsentBar />
    </>
  )
}

export default function App() {
  const { source, bundle, fallBackToStatic } = useContent()
  const forcedReduced = useForcedReducedMotion()

  // Smooth scrolling is skipped entirely when motion is reduced.
  useEffect(() => startSmoothScroll(), [forcedReduced])
  useEffect(() => startAnalytics(), [])

  return (
    <MotionConfig reducedMotion={forcedReduced ? 'always' : 'user'}>
      <ContentBoundary key={`${source}:${bundle.version}`} onError={fallBackToStatic} canRecover={source !== 'static'}>
        <Page />
      </ContentBoundary>
    </MotionConfig>
  )
}
