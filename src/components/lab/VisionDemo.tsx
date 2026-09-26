import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Walnut } from './Walnut'
import { walnutSamples, type Grade } from './walnutSamples'

type Mode = 'original' | 'detection' | 'annotated'
const MODES: { id: Mode; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'detection', label: 'Detection overlay' },
  { id: 'annotated', label: 'Annotated' },
]
const COLOR: Record<Grade, string> = { A: '#34D399', B: '#FFD166', Risk: '#FF4D6D' }
const W = 400
const H = 363

export function VisionDemo() {
  const [mode, setMode] = useState<Mode>('detection')
  const [hover, setHover] = useState<number | null>(null)
  const uv = mode !== 'original'
  const counts = walnutSamples.reduce<Record<Grade, number>>((acc, w) => ({ ...acc, [w.grade]: acc[w.grade] + 1 }), { A: 0, B: 0, Risk: 0 })
  const focus = walnutSamples.find((w) => w.id === hover)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-line" style={{ background: mode === 'original' ? '#1a1612' : '#0b0716' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto max-h-[540px] w-full" role="img" aria-label={`Walnut tray, ${mode} view, sample data`}>
          <defs>
            <radialGradient id="vd-uv" cx=".5" cy=".5" r=".75">
              <stop offset="0" stopColor="#2a1450" />
              <stop offset="1" stopColor="#0b0716" />
            </radialGradient>
            <radialGradient id="vd-day" cx=".5" cy=".4" r=".8">
              <stop offset="0" stopColor="#3a332b" />
              <stop offset="1" stopColor="#1a1612" />
            </radialGradient>
          </defs>
          <motion.rect width={W} height={H} animate={{ opacity: 1 }} fill={uv ? 'url(#vd-uv)' : 'url(#vd-day)'} />
          {walnutSamples.map((w) => (
            <Walnut key={w.id} {...w} uv={uv} />
          ))}

          <AnimatePresence>
            {mode !== 'original' &&
              walnutSamples.map((w, i) => {
                const c = COLOR[w.grade]
                const s = w.r + 7
                return (
                  <motion.g
                    key={w.id}
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: hover === null || hover === w.id ? 1 : 0.35, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(w.id)}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
                    onClick={() => setHover((h) => (h === w.id ? null : w.id))}
                    style={{ transformOrigin: `${w.x}px ${w.y}px`, cursor: 'pointer' }}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    <rect x={w.x - s} y={w.y - s} width={s * 2} height={s * 2} rx="3" fill="transparent" stroke={c} strokeWidth={hover === w.id ? 2 : 1.3} />
                    {mode === 'annotated' && (
                      <>
                        <rect x={w.x - s} y={w.y - s - 14} width="76" height="14" fill={c} />
                        <text x={w.x - s + 4} y={w.y - s - 4} fontSize="8.5" fill="#07060c">
                          {w.grade === 'Risk' ? 'RISK' : `GRADE ${w.grade}`} {w.conf.toFixed(2)}
                        </text>
                      </>
                    )}
                    {mode === 'detection' && (
                      <>
                        {[
                          [-1, -1],
                          [1, -1],
                          [-1, 1],
                          [1, 1],
                        ].map(([dx, dy], k) => (
                          <path
                            key={k}
                            d={`M${w.x + dx * s} ${w.y + dy * (s - 8)} V${w.y + dy * s} H${w.x + dx * (s - 8)}`}
                            stroke={c}
                            strokeWidth="2.5"
                            fill="none"
                          />
                        ))}
                      </>
                    )}
                  </motion.g>
                )
              })}
          </AnimatePresence>
        </svg>
        <div className="absolute left-3 top-3 rounded-full border border-violet/40 bg-ink/80 px-2.5 py-1 font-mono text-[10px] tracking-widest text-violet-200">
          <span className="sm:hidden">DEMO · SAMPLE DATA</span>
          <span className="hidden sm:inline">DEMONSTRATION · SAMPLE DATA · NO LIVE INFERENCE</span>
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-line bg-ink p-5">
        <div role="radiogroup" aria-label="View mode" className="grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-ink-2 p-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={mode === m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className="relative rounded-xl px-3 py-2 text-left text-sm transition-colors"
            >
              {mode === m.id && <motion.span layoutId="vd-mode" className="absolute inset-0 rounded-xl bg-ink-3 ring-1 ring-line-2" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              <span className={`relative ${mode === m.id ? 'text-fg' : 'text-mute'}`}>{m.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 eyebrow !text-[10px]">Batch summary</div>
        <ul className="mt-3 space-y-2.5 text-sm">
          {(['A', 'B', 'Risk'] as Grade[]).map((g) => (
            <li key={g} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[g] }} />
                {g === 'Risk' ? 'Aflatoxin risk flag' : `Grade ${g}`}
              </span>
              <span className="font-mono text-mute">{counts[g]}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 min-h-[92px] rounded-xl border border-line bg-ink-2 p-3 font-mono text-[11px]" aria-live="polite">
          {focus && mode !== 'original' ? (
            <>
              <div className="text-mute">object #{focus.id}</div>
              <div className="mt-1" style={{ color: COLOR[focus.grade] }}>
                class: {focus.grade === 'Risk' ? 'risk' : `grade_${focus.grade.toLowerCase()}`}
              </div>
              <div className="text-fg/80">confidence: {focus.conf.toFixed(2)}</div>
              <div className="text-fg/80">bbox: [{Math.round(focus.x - focus.r)}, {Math.round(focus.y - focus.r)}, {focus.r * 2}, {focus.r * 2}]</div>
            </>
          ) : (
            <span className="text-dim">{mode === 'original' ? 'Switch to a detection view to inspect objects.' : 'Hover or tap a box to inspect a detection.'}</span>
          )}
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-dim">
          A risk flag marks UV fluorescence worth lab testing — it is not a confirmed aflatoxin result.
        </p>
      </div>
    </div>
  )
}
