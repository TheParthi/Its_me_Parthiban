import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { About } from './components/sections/About'
import { Contact } from './components/sections/Contact'
import { Experience } from './components/sections/Experience'
import { Exploring } from './components/sections/Exploring'
import { Footer } from './components/sections/Footer'
import { Hero } from './components/sections/Hero'
import { Lab } from './components/sections/Lab'
import { Nav } from './components/sections/Nav'
import { Projects } from './components/sections/Projects'
import { Skills } from './components/sections/Skills'
import { Atmosphere } from './components/ui/Atmosphere'
import { startSmoothScroll } from './lib/scroll'

// Narrative: introduction → identity → projects → engineering → skills →
// experience → now → contact.
export default function App() {
  useEffect(() => startSmoothScroll(), [])

  return (
    <MotionConfig reducedMotion="user">
      <Atmosphere />
      <Nav />
      <main id="main" className="relative z-10">
        <Hero />
        <About />
        <Projects />
        <Lab />
        <Skills />
        <Experience />
        <Exploring />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  )
}
