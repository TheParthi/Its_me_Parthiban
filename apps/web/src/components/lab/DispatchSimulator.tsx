import { motion } from 'framer-motion'
import { Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../lib/motion'

// A toy model of zone-based, distance-band broadcast dispatch: offers go to
// every available driver in the nearest band at once; if nobody accepts, the
// band widens. The first acceptance wins atomically. Simulation only.

type Phase = 'idle' | 'searching' | 'assigned' | 'to-pickup' | 'on-trip' | 'done'
interface Driver {
  id: number
  x: number
  y: number
  state: 'free' | 'offered' | 'declined' | 'assigned' | 'withdrawn'
}
type Pt = { x: number; y: number }
interface LogLine {
  t: string
  text: string
  tone?: 'ok' | 'warn' | 'info'
}

// Landscape map on larger screens, portrait on phones so labels stay legible.
const WIDE = { W: 640, H: 420, BANDS: [90, 160, 240] }
const TALL = { W: 340, H: 440, BANDS: [70, 120, 175] }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const makeDrivers = (W: number, H: number): Driver[] =>
  Array.from({ length: 11 }, (_, id) => ({ id, x: rand(30, W - 30), y: rand(30, H - 30), state: 'free' }))

export function DispatchSimulator() {
  const mobile = useIsMobile()
  const { W, H, BANDS } = mobile ? TALL : WIDE
  const [drivers, setDrivers] = useState<Driver[]>(() => makeDrivers(W, H))
  const [phase, setPhase] = useState<Phase>('idle')
  const [band, setBand] = useState(-1)
  const [pickup, setPickup] = useState({ x: W / 2, y: H / 2 })
  const [drop, setDrop] = useState({ x: W - 90, y: 70 })
  const [assigned, setAssigned] = useState<number | null>(null)
  const [car, setCar] = useState<{ x: number; y: number } | null>(null)
  const [log, setLog] = useState<LogLine[]>([{ t: '00.0', text: 'Ready. Press “Request ride” to start the simulation.', tone: 'info' }])
  const timers = useRef<number[]>([])
  const start = useRef(0)

  const push = useCallback((text: string, tone?: LogLine['tone']) => {
    const t = ((performance.now() - start.current) / 1000).toFixed(1).padStart(4, '0')
    setLog((l) => [...l.slice(-7), { t, text, tone }])
  }, [])
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clear, [])

  const reset = () => {
    clear()
    setDrivers(makeDrivers(W, H))
    setPhase('idle')
    setBand(-1)
    setAssigned(null)
    setCar(null)
    setLog([{ t: '00.0', text: 'Reset. New drivers placed on the map.', tone: 'info' }])
  }

  // Rotating a tablet or resizing across the breakpoint swaps the map shape.
  const firstLayout = useRef(true)
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false
      return
    }
    reset()
  }, [mobile]) // eslint-disable-line react-hooks/exhaustive-deps

  const request = () => {
    clear()
    start.current = performance.now()
    const p = { x: rand(W * 0.28, W * 0.72), y: rand(H * 0.3, H * 0.7) }
    const d = { x: p.x < W / 2 ? rand(W * 0.78, W - 30) : rand(30, W * 0.22), y: rand(40, H - 40) }
    // Keep at least one driver within reach of the last band.
    const ds = makeDrivers(W, H)
    ds[0] = { ...ds[0], x: p.x + rand(-1, 1) * BANDS[1] * 0.6, y: p.y + rand(-1, 1) * BANDS[1] * 0.6 }
    setDrivers(ds)
    setPickup(p)
    setDrop(d)
    setAssigned(null)
    setCar(null)
    setLog([])
    setPhase('searching')
    push('Ride requested. Locating pickup zone…', 'info')
    runBand(0, ds, p, d)
  }

  const runBand = (k: number, ds: Driver[], p: Pt, dest: Pt) => {
    setBand(k)
    const inner = k === 0 ? 0 : BANDS[k - 1]
    const outer = BANDS[k]
    const inBand = ds.filter((dr) => {
      const dist = Math.hypot(dr.x - p.x, dr.y - p.y)
      return dist >= inner && dist < outer && dr.state === 'free'
    })
    later(500, () => {
      push(`Band ${k + 1} (≤${outer} m*): broadcasting to ${inBand.length} driver${inBand.length === 1 ? '' : 's'}`)
      setDrivers((cur) => cur.map((dr) => (inBand.some((b) => b.id === dr.id) ? { ...dr, state: 'offered' } : dr)))
    })
    if (inBand.length === 0) {
      later(1300, () => {
        if (k + 1 < BANDS.length) {
          push('No drivers in band — widening search.', 'warn')
          runBand(k + 1, ds, p, dest)
        } else {
          push('No drivers available. Try again.', 'warn')
          setPhase('idle')
          setBand(-1)
        }
      })
      return
    }
    // Some decline; the fastest acceptance wins.
    const winner = inBand[Math.floor(Math.random() * inBand.length)]
    const decliners = inBand.filter((d) => d.id !== winner.id && Math.random() < 0.5)
    decliners.forEach((d, i) =>
      later(1000 + i * 250, () => {
        push(`Driver #${d.id + 1} declined.`)
        setDrivers((cur) => cur.map((x) => (x.id === d.id ? { ...x, state: 'declined' } : x)))
      }),
    )
    later(1900, () => {
      push(`Driver #${winner.id + 1} accepted — ride locked (idempotent write).`, 'ok')
      if (inBand.length > 1) push('Offer withdrawn from other drivers in band.')
      setDrivers((cur) =>
        cur.map((x) =>
          x.id === winner.id ? { ...x, state: 'assigned' } : x.state === 'offered' ? { ...x, state: 'withdrawn' } : x,
        ),
      )
      setAssigned(winner.id)
      setPhase('assigned')
      setCar({ x: winner.x, y: winner.y })
      later(700, () => {
        setPhase('to-pickup')
        push('Driver en route to pickup. Live location streaming…')
        setCar(p)
      })
      later(3000, () => {
        setPhase('on-trip')
        push('Passenger picked up. Trip started.', 'ok')
        setCar(dest)
      })
    })
  }

  // Finish the trip once the vehicle has had time to reach the drop.
  useEffect(() => {
    if (phase === 'on-trip') {
      const t = window.setTimeout(() => {
        setPhase('done')
        push('Arrived at destination. Trip complete.', 'ok')
      }, 2600)
      return () => clearTimeout(t)
    }
  }, [phase, push])

  const busy = phase !== 'idle' && phase !== 'done'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-[#070b10]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Simulated dispatch map">
          <defs>
            <pattern id="ds-blocks" width="64" height="48" patternUnits="userSpaceOnUse">
              <rect x="5" y="5" width="54" height="38" rx="3" fill="#0e1620" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#ds-blocks)" />
          <g stroke="#15212c" strokeWidth="8">
            <path d={`M0 ${H * 0.35} H${W}`} />
            <path d={`M${W * 0.55} 0 V${H}`} />
          </g>

          {/* Distance bands */}
          {band >= 0 &&
            BANDS.map((r, i) => (
              <motion.circle
                key={i}
                cx={pickup.x}
                cy={pickup.y}
                fill={i === band && phase === 'searching' ? 'rgba(0,229,255,.06)' : 'none'}
                stroke={i <= band ? '#00E5FF' : 'rgba(255,255,255,.08)'}
                strokeOpacity={i === band ? 0.7 : 0.25}
                strokeDasharray="4 6"
                initial={{ r: 0 }}
                animate={{ r: i <= band ? r : 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}

          {/* Trip line */}
          {(phase === 'to-pickup' || phase === 'on-trip' || phase === 'done' || phase === 'assigned') && (
            <path d={`M${pickup.x} ${pickup.y} L${drop.x} ${drop.y}`} stroke="#8B5CF6" strokeWidth="2" strokeDasharray="5 6" className="flow" />
          )}

          {/* Drivers */}
          {drivers.map((d) => {
            if (d.id === assigned) return null
            const c =
              d.state === 'offered' ? '#FFD166' : d.state === 'declined' ? '#FF4D6D' : d.state === 'withdrawn' ? '#5c6170' : '#8B5CF6'
            return (
              <g key={d.id} transform={`translate(${d.x} ${d.y})`}>
                {d.state === 'offered' && <circle r="7" fill="none" stroke={c} className="pulse-ring" />}
                <circle r="6" fill={c} />
                <text y="-11" textAnchor="middle" fontSize="9" fill="#969BA8" fontFamily="JetBrains Mono, monospace">
                  #{d.id + 1}
                </text>
              </g>
            )
          })}

          {/* Pickup + drop */}
          {phase !== 'idle' || band >= 0 ? (
            <>
              <g transform={`translate(${pickup.x} ${pickup.y})`}>
                <circle r="16" fill="#00E5FF" opacity=".15" />
                <circle r="7" fill="#00E5FF" />
                <text y="30" textAnchor="middle" fontSize="10" fill="#00E5FF" fontFamily="JetBrains Mono, monospace">
                  PICKUP
                </text>
              </g>
              <g transform={`translate(${drop.x} ${drop.y})`}>
                <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#8B5CF6" />
                <text y="24" textAnchor="middle" fontSize="10" fill="#c4b5fd" fontFamily="JetBrains Mono, monospace">
                  DROP
                </text>
              </g>
            </>
          ) : null}

          {/* Assigned vehicle */}
          {car && (
            <motion.g
              initial={false}
              animate={{ x: car.x, y: car.y }}
              transition={{ duration: phase === 'assigned' ? 0 : 2.2, ease: 'easeInOut' }}
            >
              <circle r="14" fill="#34D399" opacity=".2" />
              <circle r="7" fill="#34D399" stroke="#070b10" strokeWidth="2" />
            </motion.g>
          )}
        </svg>
        <div className="absolute left-3 top-3 rounded-full border border-amber-300/30 bg-ink/80 px-2.5 py-1 font-mono text-[10px] tracking-widest text-amber-200">
          SIMULATION · NOT LIVE NEXARIDE DATA
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-line bg-ink p-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={request}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-fg px-4 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" /> Request ride
          </button>
          <button type="button" onClick={reset} aria-label="Reset simulation" className="grid h-10 w-10 place-items-center rounded-full border border-line-2 hover:bg-ink-3">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 eyebrow !text-[10px]">Dispatch log</div>
        <ol className="mt-3 flex-1 space-y-2 font-mono text-[11px] leading-relaxed" aria-live="polite">
          {log.map((l, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-dim">{l.t}s</span>
              <span className={l.tone === 'ok' ? 'text-emerald-300' : l.tone === 'warn' ? 'text-amber-200' : l.tone === 'info' ? 'text-cyan' : 'text-fg/80'}>
                {l.text}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4 font-mono text-[10px] text-mute">
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet" />available</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#FFD166]" />offered</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#FF4D6D]" />declined</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-400" />assigned</span>
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-dim">* Distances are illustrative map units.</p>
      </div>
    </div>
  )
}
