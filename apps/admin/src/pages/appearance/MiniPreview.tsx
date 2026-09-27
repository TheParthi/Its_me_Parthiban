import { useState, type CSSProperties } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import type { Appearance } from '@pg/shared'
import { Segmented } from '../../components/ui'
import { fontFamily } from './fonts'

const RADIUS = { sharp: 2, soft: 10, round: 20 } as const
const BUTTON_RADIUS = { pill: 999, rounded: 10, square: 2 } as const
const SPACING = { compact: 20, normal: 32, spacious: 48 } as const
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>\")"

/** A small, self-contained rendering of the chosen tokens. */
export function MiniPreview({ a }: { a: Appearance }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const c = a.colors
  const mobile = device === 'mobile'
  const pad = SPACING[a.sectionSpacing] * (mobile ? 0.75 : 1)
  const btn: CSSProperties = {
    borderRadius: BUTTON_RADIUS[a.buttonStyle],
    padding: mobile ? '8px 14px' : '10px 18px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fontFamily(a.typography.body),
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="eyebrow">Token preview</span>
        <Segmented
          size="sm"
          aria-label="Token preview width"
          value={device}
          onChange={setDevice}
          options={[
            { value: 'desktop', label: <span className="sr-only">Desktop</span>, icon: <Monitor className="h-3.5 w-3.5" />, title: 'Desktop' },
            { value: 'mobile', label: <span className="sr-only">Mobile</span>, icon: <Smartphone className="h-3.5 w-3.5" />, title: 'Mobile (360px)' },
          ]}
        />
      </div>
      <div className="bg-[#050608] p-3">
        <div
          className="relative mx-auto overflow-hidden transition-[width] duration-300"
          style={{ width: mobile ? 360 : '100%', maxWidth: '100%', background: c.background, color: c.text, fontFamily: fontFamily(a.typography.body), borderRadius: 8 }}
        >
          {a.showGrain && <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay" style={{ backgroundImage: GRAIN }} aria-hidden />}
          {/* Nav */}
          <div style={{ padding: a.navStyle === 'floating' ? '12px 12px 0' : 0 }}>
            <div
              className="flex items-center justify-between gap-3"
              style={{
                background: a.navStyle === 'floating' ? `${c.surface}e6` : c.surface,
                border: `1px solid ${c.border}`,
                borderWidth: a.navStyle === 'floating' ? 1 : '0 0 1px 0',
                borderRadius: a.navStyle === 'floating' ? 999 : 0,
                padding: '8px 14px',
              }}
            >
              <span style={{ fontFamily: fontFamily(a.typography.display), fontWeight: 700, fontSize: 14 }}>
                <span style={{ color: c.accent }}>●</span> Portfolio
              </span>
              {!mobile ? (
                <span className="flex gap-4" style={{ fontSize: 12, color: c.textMuted }}>
                  <span style={{ color: c.text }}>Work</span>
                  <span>About</span>
                  <span>Lab</span>
                  <span>Contact</span>
                </span>
              ) : (
                <span style={{ fontSize: 16, color: c.textMuted }} aria-hidden>
                  ☰
                </span>
              )}
            </div>
          </div>
          {/* Hero */}
          <div style={{ padding: `${pad}px ${mobile ? 18 : 28}px` }}>
            <p style={{ fontFamily: fontFamily(a.typography.mono), fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.accentSecondary }}>Selected work</p>
            <h3
              style={{
                fontFamily: fontFamily(a.typography.display),
                fontSize: (mobile ? 26 : 36) * a.headingScale,
                lineHeight: 1.08,
                fontWeight: 700,
                margin: '8px 0 10px',
                letterSpacing: '-0.02em',
                color: c.text,
              }}
            >
              Things I've <span style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.accentSecondary})`, WebkitBackgroundClip: 'text', color: 'transparent' }}>engineered.</span>
            </h3>
            <p style={{ color: c.textMuted, fontSize: 14, lineHeight: 1.6, maxWidth: 460 }}>Production systems, side projects and experiments — built with care from the database to the pixel.</p>
            <div className="flex flex-wrap gap-2.5" style={{ marginTop: 18 }}>
              <span style={{ ...btn, background: c.accent, color: '#fff' }}>View projects</span>
              <span style={{ ...btn, border: `1px solid ${c.border}`, background: c.surfaceRaised, color: c.text }}>Get in touch</span>
            </div>
            {/* Card */}
            <div style={{ marginTop: pad, background: c.surface, border: `1px solid ${c.border}`, borderRadius: RADIUS[a.radius], padding: 16 }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ fontFamily: fontFamily(a.typography.display), fontWeight: 600, fontSize: 16 * a.headingScale }}>Sample project</span>
                <span style={{ fontFamily: fontFamily(a.typography.mono), fontSize: 10.5, color: c.accentSecondary, border: `1px solid ${c.border}`, borderRadius: 999, padding: '2px 8px' }}>2025</span>
              </div>
              <p style={{ color: c.textMuted, fontSize: 13, marginTop: 6 }}>A card rendered with your radius, surface and border tokens.</p>
              <div className="flex gap-1.5" style={{ marginTop: 10 }}>
                {['TypeScript', 'NestJS', 'Redis'].map((t) => (
                  <span key={t} style={{ fontFamily: fontFamily(a.typography.mono), fontSize: 10.5, background: c.surfaceRaised, color: c.text, borderRadius: Math.min(RADIUS[a.radius], 8), padding: '3px 7px' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
