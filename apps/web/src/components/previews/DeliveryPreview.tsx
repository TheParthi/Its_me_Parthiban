import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../lib/motion'

// Warm, food-inspired Dendo showcase: a phone mockup with a menu and a live
// order tracker. Dishes are abstract illustrations, not photos.

const STEPS = ['Placed', 'Preparing', 'Picked up', 'On the way']
const DISHES = [
  { name: 'Masala Dosa', price: '₹120', a: '#F6C177', b: '#C8742C' },
  { name: 'Paneer Tikka', price: '₹210', a: '#FF9F43', b: '#D9480F' },
  { name: 'Veg Biryani', price: '₹180', a: '#FFD28A', b: '#E67E22' },
]

function Dish({ a, b }: { a: string; b: string }) {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#fff" opacity=".08" />
      <circle cx="24" cy="24" r="17" fill={b} />
      <circle cx="21" cy="21" r="10" fill={a} />
      <circle cx="30" cy="28" r="4" fill="#fff" opacity=".6" />
      <circle cx="17" cy="30" r="2.5" fill="#3f8f3a" />
    </svg>
  )
}

export function DeliveryPreview() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(reduced ? 3 : 0)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setStep((s) => (s + 1) % (STEPS.length + 1)), 1600)
    return () => clearInterval(t)
  }, [reduced])
  const shown = Math.min(step, STEPS.length - 1)

  // Lay out on a fixed 800×520 canvas and scale it, like the SVG previews,
  // so the composition holds together on a phone.
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 800))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
    <div
      className="absolute left-0 top-0 flex h-[520px] w-[800px] origin-top-left items-center justify-center gap-8 overflow-hidden p-6"
      style={{ transform: `scale(${scale})`, background: 'radial-gradient(120% 90% at 20% 10%, #2a1608 0%, #120a05 55%, #0b0704 100%)' }}
      role="img"
      aria-label="Illustration of a food ordering app with live order tracking"
    >
      <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#FF9F43]/20 blur-[90px]" />

      {/* Phone */}
      <div className="relative z-10 w-[260px] shrink-0 rounded-[34px] border border-white/10 bg-[#140d08] p-2.5 shadow-2xl shadow-black/60">
        <div className="overflow-hidden rounded-[26px] bg-[#1b120b]">
          <div className="flex items-center justify-between px-4 pt-3 text-[9px] text-white/50">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-black" />
            <span>5G</span>
          </div>
          <div className="px-4 pb-3 pt-3">
            <div className="text-[10px] uppercase tracking-widest text-[#FF9F43]">Deliver to · Home</div>
            <div className="mt-1 font-display text-lg font-semibold leading-tight text-white">Annapoorna Kitchen</div>
            <div className="mt-0.5 text-[10px] text-white/50">South Indian · 25 min · ★ 4.6</div>
          </div>
          <div className="space-y-2 px-3 pb-3">
            {DISHES.map((d, i) => (
              <div
                key={d.name}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2 transition-colors duration-500"
                style={{ background: step > 0 && i === 0 ? 'rgba(255,159,67,.12)' : undefined }}
              >
                <Dish a={d.a} b={d.b} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white">{d.name}</div>
                  <div className="text-[10px] text-white/50">{d.price}</div>
                </div>
                <span className="rounded-full bg-[#FF9F43] px-2 py-1 text-[9px] font-semibold text-[#1b120b]">
                  {step > 0 && i === 0 ? '1' : 'ADD'}
                </span>
              </div>
            ))}
          </div>
          <div className="m-3 mt-1 rounded-2xl bg-[#FF9F43] px-4 py-2.5 text-center text-[11px] font-semibold text-[#1b120b]">
            {step === 0 ? 'Place order · ₹120' : 'Tracking order'}
          </div>
        </div>
      </div>

      {/* Order tracker */}
      <div className="relative z-10 flex w-[240px] flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
          <div className="font-mono text-[10px] tracking-widest text-white/50">ORDER #D-2841</div>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s, i) => {
              const done = step > 0 && i <= shown
              return (
                <li key={s} className="flex items-center gap-3 text-[12px]">
                  <span
                    className="grid h-5 w-5 place-items-center rounded-full border transition-all duration-500"
                    style={{
                      borderColor: done ? '#FF9F43' : 'rgba(255,255,255,.2)',
                      background: done ? '#FF9F43' : 'transparent',
                    }}
                  >
                    {done && <span className="h-1.5 w-1.5 rounded-full bg-[#1b120b]" />}
                  </span>
                  <span className={done ? 'text-white' : 'text-white/40'}>{s}</span>
                </li>
              )
            })}
          </ol>
        </div>
        <svg viewBox="0 0 240 110" className="w-full rounded-2xl border border-white/10 bg-black/30" aria-hidden>
          <path id="dl-path" d="M20 85 C70 85 70 30 120 30 S170 80 220 40" fill="none" stroke="#FF9F43" strokeWidth="2.5" strokeDasharray="4 6" className="flow" />
          <circle cx="20" cy="85" r="5" fill="#FFD28A" />
          <circle cx="220" cy="40" r="6" fill="#FF9F43" />
          <g>
            <circle r="7" fill="#fff" />
            <circle r="3" fill="#D9480F" />
            <animateMotion dur="5s" repeatCount="indefinite">
              <mpath href="#dl-path" />
            </animateMotion>
          </g>
        </svg>
      </div>
    </div>
    </div>
  )
}
