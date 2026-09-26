import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { EASE, useIsMobile } from '../../lib/motion'

// NexaRide system map. Coordinates are in a 1000×560 design space and
// rendered as percentages so the diagram scales with its container.

interface Node {
  id: string
  label: string
  tech: string
  x: number
  y: number
  group: 'client' | 'edge' | 'core' | 'data' | 'external'
  detail: string
}

const NODES: Node[] = [
  { id: 'rider', label: 'Rider app', tech: 'React Native', x: 110, y: 90, group: 'client', detail: 'Books rides and parcels, tracks the driver live, pays in-app. Shares typed DTOs and socket event names with every other client through @nexaride/shared.' },
  { id: 'driver', label: 'Driver app', tech: 'React Native', x: 110, y: 280, group: 'client', detail: 'Streams location in the background, receives ride offers and accepts or declines. Offers expire if not answered in time.' },
  { id: 'admin', label: 'Ops console', tech: 'Next.js', x: 110, y: 470, group: 'client', detail: 'Operations dashboard: live map of drivers and rides, pricing, zones and support tools.' },
  { id: 'api', label: 'REST API', tech: 'NestJS', x: 420, y: 170, group: 'core', detail: '48 modules, 34 controllers, 55 services, 368 endpoints. Follows a controller → service → repository layering with validation at the edge.' },
  { id: 'auth', label: 'Auth', tech: 'JWT · RBAC', x: 420, y: 40, group: 'edge', detail: 'Token-based authentication with role-based access control, so riders, drivers and admins only reach their own routes.' },
  { id: 'ws', label: 'Realtime gateway', tech: 'Socket.IO', x: 420, y: 390, group: 'core', detail: 'Pushes offers, driver location and ETA. Horizontally scaled — any node can serve any client, no sticky sessions.' },
  { id: 'redis', label: 'Pub/sub', tech: 'Redis', x: 720, y: 470, group: 'data', detail: 'Socket.IO Redis adapter fans events out across server nodes; also used for short-lived state and caching.' },
  { id: 'db', label: 'Database', tech: 'PostgreSQL + PostGIS', x: 720, y: 170, group: 'data', detail: '77-model schema through Prisma. PostGIS powers the nearby-driver and zone queries behind dispatch.' },
  { id: 'maps', label: 'Maps', tech: 'Google Maps API', x: 880, y: 330, group: 'external', detail: 'Geocoding, routes and ETA for rides, surfaced to riders and drivers in real time.' },
]

const EDGES: [string, string][] = [
  ['rider', 'api'],
  ['driver', 'api'],
  ['admin', 'api'],
  ['rider', 'ws'],
  ['driver', 'ws'],
  ['admin', 'ws'],
  ['api', 'auth'],
  ['api', 'db'],
  ['ws', 'redis'],
  ['ws', 'db'],
  ['api', 'maps'],
]

const GROUP_COLOR: Record<Node['group'], string> = {
  client: '#00E5FF',
  edge: '#FFD166',
  core: '#8B5CF6',
  data: '#34D399',
  external: '#969BA8',
}

const W = 1000
const H = 560
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

const TIERS: { label: string; ids: string[] }[] = [
  { label: 'Clients', ids: ['rider', 'driver', 'admin'] },
  { label: 'Edge & core', ids: ['auth', 'api', 'ws'] },
  { label: 'Data & services', ids: ['db', 'redis', 'maps'] },
]

/** Phone layout: the same system as stacked tiers, with linked parts lit up. */
function TierMap({ sel, linked, onSelect }: { sel: string; linked: Set<string>; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-ink p-3">
      {TIERS.map((tier, t) => (
        <div key={tier.label}>
          {t > 0 && (
            <div className="flex justify-center py-1.5" aria-hidden>
              <span className="relative h-5 w-px overflow-hidden bg-line-2">
                <span className="absolute inset-x-0 top-0 h-2 animate-[tier-flow_1.2s_linear_infinite] bg-cyan" />
              </span>
            </div>
          )}
          <div className="font-mono text-[9px] tracking-widest text-dim">{tier.label.toUpperCase()}</div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {tier.ids.map((id) => {
              const n = byId[id]
              const active = id === sel
              const lit = linked.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-pressed={active}
                  className="min-h-[56px] rounded-xl border px-2 py-2 text-left transition-all duration-300"
                  style={{
                    borderColor: active ? GROUP_COLOR[n.group] : lit ? `${GROUP_COLOR[n.group]}66` : 'rgba(255,255,255,.1)',
                    background: active ? 'rgba(22,25,35,1)' : 'rgba(10,11,15,.9)',
                    opacity: active || lit ? 1 : 0.55,
                  }}
                >
                  <span className="flex items-center gap-1.5 font-display text-[12px] font-medium leading-tight">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GROUP_COLOR[n.group] }} />
                    {n.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] leading-tight text-mute">{n.tech}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <style>{`@keyframes tier-flow { from { transform: translateY(-8px) } to { transform: translateY(20px) } }`}</style>
    </div>
  )
}

export function ArchitectureExplorer() {
  const [sel, setSel] = useState<string>('ws')
  const mobile = useIsMobile()
  const node = byId[sel]
  const linked = new Set(EDGES.filter(([a, b]) => a === sel || b === sel).flat())

  return (
    <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_300px]">
      {mobile ? (
        <TierMap sel={sel} linked={linked} onSelect={setSel} />
      ) : (
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink">
        <div className="relative" style={{ aspectRatio: `${W}/${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id="ae-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.06)" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#ae-dots)" />
            {EDGES.map(([a, b]) => {
              const A = byId[a]
              const B = byId[b]
              const on = a === sel || b === sel
              const mx = (A.x + B.x) / 2
              const d = `M${A.x} ${A.y} C${mx} ${A.y} ${mx} ${B.y} ${B.x} ${B.y}`
              return (
                <g key={a + b}>
                  <path d={d} fill="none" stroke={on ? GROUP_COLOR[byId[sel].group] : 'rgba(255,255,255,.1)'} strokeWidth={on ? 1.6 : 1} />
                  {on && (
                    <>
                      <path d={d} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" className="flow" />
                      <circle r="4" fill={GROUP_COLOR[byId[sel].group]}>
                        <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
                      </circle>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
          {NODES.map((n) => {
            const active = n.id === sel
            const dim = !active && !linked.has(n.id)
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSel(n.id)}
                aria-pressed={active}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-left transition-all duration-300"
                style={{
                  left: `${(n.x / W) * 100}%`,
                  top: `${(n.y / H) * 100}%`,
                  borderColor: active ? GROUP_COLOR[n.group] : 'rgba(255,255,255,.12)',
                  background: active ? 'rgba(16,18,24,.95)' : 'rgba(10,11,15,.9)',
                  opacity: dim ? 0.45 : 1,
                  boxShadow: active ? `0 0 0 4px ${GROUP_COLOR[n.group]}22, 0 0 40px ${GROUP_COLOR[n.group]}33` : 'none',
                }}
              >
                <span className="flex items-center gap-2 whitespace-nowrap font-display text-[13px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: GROUP_COLOR[n.group] }} />
                  {n.label}
                </span>
                <span className="mt-0.5 block whitespace-nowrap font-mono text-[10px] text-mute">{n.tech}</span>
              </button>
            )
          })}
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-line bg-ink p-5" aria-live="polite">
        <div className="eyebrow">Component</div>
        <AnimatePresence mode="wait">
          <motion.div key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
            <h4 className="mt-3 font-display text-2xl font-semibold">{node.label}</h4>
            <div className="mt-1 font-mono text-xs" style={{ color: GROUP_COLOR[node.group] }}>
              {node.tech}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-mute">{node.detail}</p>
            <div className="mt-5 border-t border-line pt-4">
              <div className="eyebrow !text-[10px]">Talks to</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[...linked]
                  .filter((id) => id !== sel)
                  .map((id) => (
                    <li key={id}>
                      <button type="button" onClick={() => setSel(id)} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-fg/80 hover:border-fg/50">
                        {byId[id].label}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-dim">{mobile ? 'Tap any component. Lit parts are the ones it talks to.' : 'Click any component. Animated paths show where data flows.'}</p>
      </div>
    </div>
  )
}
