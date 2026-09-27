import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, Network, ScanEye } from 'lucide-react'
import { useState } from 'react'
import { headingSize, PAD_DEFAULT, SectionBackdrop, sectionAttrs, useSection } from '../../content/sections'
import { EASE } from '../../lib/motion'
import { ArchitectureExplorer } from '../lab/ArchitectureExplorer'
import { DispatchSimulator } from '../lab/DispatchSimulator'
import { VisionDemo } from '../lab/VisionDemo'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

const EXPERIMENTS = [
  {
    id: 'arch',
    code: 'EXP-A',
    title: 'System Architecture Explorer',
    short: 'Architecture',
    blurb: 'How NexaRide fits together — clients, API, real-time gateway and data.',
    icon: Network,
    Component: ArchitectureExplorer,
  },
  {
    id: 'dispatch',
    code: 'EXP-B',
    title: 'Real-Time Dispatch Simulator',
    short: 'Dispatch sim',
    blurb: 'Distance-band broadcast matching, the algorithm behind ride assignment.',
    icon: Cpu,
    Component: DispatchSimulator,
  },
  {
    id: 'vision',
    code: 'EXP-C',
    title: 'Computer Vision Demo',
    short: 'Vision demo',
    blurb: 'Walnut grading and UV risk flags, from raw frame to annotated output.',
    icon: ScanEye,
    Component: VisionDemo,
  },
] as const

export function Lab() {
  const view = useSection('lab')
  const [active, setActive] = useState<(typeof EXPERIMENTS)[number]['id']>('arch')
  const exp = EXPERIMENTS.find((e) => e.id === active)!

  return (
    <section id="lab" className="sec-y relative overflow-hidden px-5 sm:px-8" {...sectionAttrs(view, PAD_DEFAULT)}>
      <SectionBackdrop view={view} />
      <div aria-hidden data-deco className="bg-grid absolute inset-0 -z-10 opacity-40 [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_80%,transparent)]" />
      <div aria-hidden data-deco className="absolute left-1/2 top-40 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet/10 blur-[160px]" />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SectionLabel index={view.index}>{view.eyebrow || 'Engineering'}</SectionLabel>
            <SplitHeading
              text={view.heading || 'Inside My Engineering Lab.'}
              className={`mt-8 font-display ${headingSize.lg} font-semibold leading-[0.92] tracking-[-0.04em]`}
            />
          </div>
          <Reveal className="self-end lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-mute">
              {view.description ||
                'Three working experiments drawn from real projects. They run entirely in your browser on sample data — explore the system, trigger a dispatch, inspect a detection.'}
            </p>
          </Reveal>
        </div>

        <Reveal y={50}>
          <div className="mt-16 overflow-hidden rounded-[28px] border border-line bg-ink-2/80 backdrop-blur">
            {/* Console header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3 font-mono text-[11px] text-dim">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 hidden sm:inline">lab://parthiban/{exp.id}</span>
              </div>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> running locally
              </span>
            </div>

            {/* Experiment selector */}
            <div role="tablist" aria-label="Experiments" className="grid grid-cols-3 border-b border-line">
              {EXPERIMENTS.map((e) => {
                const on = e.id === active
                const Icon = e.icon
                return (
                  <button
                    key={e.id}
                    role="tab"
                    id={`tab-${e.id}`}
                    aria-selected={on}
                    aria-controls={`panel-${e.id}`}
                    type="button"
                    onClick={() => setActive(e.id)}
                    className={`group relative flex flex-col items-start gap-2 border-r border-line p-3 text-left transition-colors last:border-r-0 sm:p-4 md:flex-row md:gap-4 md:p-5 ${on ? 'bg-ink/60' : 'hover:bg-ink/30'}`}
                  >
                    {on && <motion.span layoutId="lab-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-violet to-cyan" />}
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors md:h-10 md:w-10 ${on ? 'border-cyan/50 text-cyan' : 'border-line text-mute group-hover:text-fg'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="font-mono text-[10px] tracking-widest text-dim">{e.code}</span>
                      <span className={`mt-1 block font-display text-[13px] font-medium leading-snug md:text-[15px] ${on ? 'text-fg' : 'text-fg/70'}`}>
                        <span className="md:hidden">{e.short}</span>
                        <span className="hidden md:inline">{e.title}</span>
                      </span>
                      <span className="mt-1 hidden text-xs leading-relaxed text-mute md:block">{e.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="p-3 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={exp.id}
                  role="tabpanel"
                  id={`panel-${exp.id}`}
                  aria-labelledby={`tab-${exp.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <exp.Component />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
