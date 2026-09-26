// Stylised NexaRide tracking dashboard: city grid, live route, moving vehicle.
// Original illustration — not a product screenshot.

const ROUTE = 'M120 410 L120 300 Q120 270 150 270 L330 270 Q360 270 360 240 L360 150 Q360 120 390 120 L560 120 Q590 120 590 150 L590 200 Q590 230 620 230 L690 230'

export function MobilityPreview() {
  return (
    <svg viewBox="0 0 800 520" className="h-full w-full" role="img" aria-label="Illustration of a live ride-tracking dashboard">
      <defs>
        <linearGradient id="mb-route" x1="0" x2="1">
          <stop offset="0" stopColor="#00E5FF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id="mb-vignette" cx=".5" cy=".45" r=".7">
          <stop offset=".5" stopColor="#0a0f16" stopOpacity="0" />
          <stop offset="1" stopColor="#05070b" />
        </radialGradient>
        <pattern id="mb-blocks" width="80" height="60" patternUnits="userSpaceOnUse">
          <rect x="6" y="6" width="68" height="48" rx="4" fill="#0f1822" />
        </pattern>
        <filter id="mb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="800" height="520" fill="#070b10" />
      <rect width="800" height="520" fill="url(#mb-blocks)" />
      {/* Arterials */}
      <g stroke="#162330" strokeWidth="10" fill="none">
        <path d="M0 270 H800" />
        <path d="M360 0 V520" />
        <path d="M590 0 V520" />
        <path d="M0 120 H800" />
      </g>
      {/* River */}
      <path d="M-20 470 C160 420 260 500 420 450 S700 380 820 420" stroke="#0d2a3a" strokeWidth="26" fill="none" />
      {/* Park */}
      <rect x="440" y="300" width="120" height="120" rx="10" fill="#0c1d17" />

      {/* Route */}
      <path d={ROUTE} stroke="url(#mb-route)" strokeWidth="10" fill="none" opacity=".25" filter="url(#mb-glow)" />
      <path id="mb-path" d={ROUTE} stroke="url(#mb-route)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROUTE} stroke="#fff" strokeWidth="1.5" fill="none" className="flow" opacity=".6" />

      {/* Nearby drivers */}
      {[
        [250, 200],
        [480, 60],
        [700, 330],
        [200, 350],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} opacity=".7">
          <circle r="5" fill="#8B5CF6" />
          <circle r="5" fill="none" stroke="#8B5CF6" className="pulse-ring" style={{ animationDelay: `${i * 0.5}s` }} />
        </g>
      ))}

      {/* Pickup */}
      <g transform="translate(120 410)">
        <circle r="18" fill="#00E5FF" opacity=".15" className="pulse-ring" />
        <circle r="8" fill="#00E5FF" />
        <circle r="3" fill="#070b10" />
      </g>
      {/* Drop */}
      <g transform="translate(690 230)">
        <path d="M0 -26 C-12 -26 -18 -17 -18 -9 C-18 4 0 14 0 14 C0 14 18 4 18 -9 C18 -17 12 -26 0 -26Z" fill="#8B5CF6" />
        <circle cy="-10" r="5" fill="#070b10" />
      </g>

      {/* Vehicle riding the route */}
      <g>
        <circle r="16" fill="#00E5FF" opacity=".25" filter="url(#mb-glow)" />
        <rect x="-11" y="-7" width="22" height="14" rx="4" fill="#F5F7FA" />
        <rect x="2" y="-5" width="6" height="10" rx="2" fill="#0a0f16" />
        <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
          <mpath href="#mb-path" />
        </animateMotion>
      </g>

      <rect width="800" height="520" fill="url(#mb-vignette)" />

      {/* Floating status chips */}
      <g fontFamily="JetBrains Mono, monospace" fontSize="11">
        <g transform="translate(28 28)">
          <rect width="190" height="58" rx="12" fill="#0d131b" stroke="rgba(255,255,255,.1)" />
          <circle cx="20" cy="22" r="4" fill="#34d399" />
          <text x="32" y="26" fill="#F5F7FA">DRIVER ASSIGNED</text>
          <text x="16" y="44" fill="#969BA8">KA·05 · Sedan · 4.9★</text>
        </g>
        <g transform="translate(582 28)">
          <rect width="190" height="58" rx="12" fill="#0d131b" stroke="rgba(255,255,255,.1)" />
          <text x="16" y="26" fill="#969BA8">ETA</text>
          <text x="16" y="46" fill="#F5F7FA" fontSize="18" fontFamily="Space Grotesk, sans-serif">
            12 min
          </text>
          <text x="112" y="46" fill="#00E5FF">6.4 km</text>
        </g>
        <g transform="translate(28 452)">
          <rect width="236" height="40" rx="20" fill="#0d131b" stroke="rgba(0,229,255,.35)" />
          <circle cx="22" cy="20" r="4" fill="#00E5FF" className="blink" />
          <text x="36" y="24" fill="#F5F7FA">LIVE · socket connected</text>
        </g>
      </g>
    </svg>
  )
}
