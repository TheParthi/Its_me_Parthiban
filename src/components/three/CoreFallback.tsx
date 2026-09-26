/** Lightweight SVG stand-in for the WebGL core on mobile / reduced motion. */
export function CoreFallback() {
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2
      return `${200 + r * Math.cos(a)},${200 + r * Math.sin(a)}`
    }).join(' ')

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="cf-glow">
          <stop offset="0" stopColor="#8B5CF6" stopOpacity=".45" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cf-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2d3a" />
          <stop offset="1" stopColor="#0d0e14" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="170" fill="url(#cf-glow)" />
      <g style={{ transformOrigin: '200px 200px', animation: 'cf-spin 40s linear infinite' }}>
        <polygon points={hex(150)} fill="none" stroke="#8B5CF6" strokeOpacity=".35" />
        <polygon points={hex(120)} fill="none" stroke="#00E5FF" strokeOpacity=".25" strokeDasharray="3 6" />
      </g>
      <ellipse cx="200" cy="200" rx="160" ry="44" fill="none" stroke="#00E5FF" strokeOpacity=".4" transform="rotate(-18 200 200)" />
      <ellipse cx="200" cy="200" rx="175" ry="60" fill="none" stroke="#8B5CF6" strokeOpacity=".35" transform="rotate(24 200 200)" />
      <polygon points={hex(64)} fill="url(#cf-face)" stroke="#fff" strokeOpacity=".15" />
      <polygon points={hex(30)} fill="none" stroke="#00E5FF" strokeOpacity=".7" />
      <circle cx="200" cy="200" r="4" fill="#fff" />
      <style>{`@keyframes cf-spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}
