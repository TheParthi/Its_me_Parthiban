// BlockSpy concept visual: a wallet graph with transaction paths, flagged
// clusters and a risk gauge. Clearly a concept, not live data.

const NODES: { id: string; x: number; y: number; risk?: boolean; r?: number }[] = [
  { id: 'a', x: 110, y: 120 },
  { id: 'b', x: 230, y: 70 },
  { id: 'c', x: 260, y: 210, r: 12 },
  { id: 'd', x: 150, y: 330 },
  { id: 'e', x: 380, y: 150, risk: true, r: 13 },
  { id: 'f', x: 420, y: 300 },
  { id: 'g', x: 520, y: 90 },
  { id: 'h', x: 540, y: 230, risk: true },
  { id: 'i', x: 330, y: 400 },
  { id: 'j', x: 470, y: 420 },
  { id: 'k', x: 60, y: 240 },
]
const EDGES: [string, string, boolean?][] = [
  ['a', 'b'],
  ['a', 'c'],
  ['k', 'a'],
  ['k', 'd'],
  ['b', 'e', true],
  ['c', 'e', true],
  ['c', 'd'],
  ['d', 'i'],
  ['e', 'g'],
  ['e', 'h', true],
  ['f', 'h', true],
  ['c', 'f'],
  ['i', 'j'],
  ['f', 'j'],
  ['g', 'h'],
]
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

export function SecurityPreview() {
  return (
    <svg viewBox="0 0 800 520" className="h-full w-full" role="img" aria-label="Concept illustration of a blockchain risk graph">
      <defs>
        <radialGradient id="sp-bg" cx=".35" cy=".4" r=".8">
          <stop offset="0" stopColor="#10141c" />
          <stop offset="1" stopColor="#06070a" />
        </radialGradient>
        <filter id="sp-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <pattern id="sp-hex" width="28" height="48" patternUnits="userSpaceOnUse" patternTransform="scale(.8)">
          <path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8Z M14 32 L14 48" fill="none" stroke="rgba(255,255,255,.035)" />
        </pattern>
      </defs>
      <rect width="800" height="520" fill="url(#sp-bg)" />
      <rect width="800" height="520" fill="url(#sp-hex)" />

      <g transform="translate(20 20)">
        {EDGES.map(([a, b, risk], i) => {
          const A = byId[a]
          const B = byId[b]
          return (
            <g key={i}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={risk ? '#FF4D6D' : '#00E5FF'} strokeOpacity={risk ? 0.55 : 0.22} strokeWidth={risk ? 1.6 : 1} />
              <circle r={risk ? 3 : 2.2} fill={risk ? '#FF4D6D' : '#00E5FF'}>
                <animateMotion dur={`${2.4 + (i % 4) * 0.7}s`} repeatCount="indefinite" path={`M${A.x} ${A.y} L${B.x} ${B.y}`} />
              </circle>
            </g>
          )
        })}
        {NODES.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            {n.risk && <circle r={(n.r ?? 9) + 10} fill="#FF4D6D" opacity=".35" filter="url(#sp-glow)" />}
            {n.risk && <circle r={n.r ?? 9} fill="none" stroke="#FF4D6D" className="pulse-ring" />}
            <circle r={n.r ?? 8} fill="#0b0e14" stroke={n.risk ? '#FF4D6D' : 'rgba(0,229,255,.7)'} strokeWidth="1.5" />
            <circle r={3} fill={n.risk ? '#FF4D6D' : '#00E5FF'} />
          </g>
        ))}
        <g fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#969BA8">
          <text x="392" y="128">0x7f3a…c21e</text>
          <text x="470" y="262" fill="#FF8FA3">
            mixer-pattern
          </text>
        </g>
      </g>

      {/* Side panel */}
      <g transform="translate(600 24)" fontFamily="JetBrains Mono, monospace">
        <rect width="176" height="472" rx="14" fill="#0b0d12" stroke="rgba(255,255,255,.08)" />
        <text x="16" y="30" fontSize="10" fill="#969BA8" letterSpacing="1.5">
          RISK SCORE
        </text>
        <g transform="translate(88 110)">
          <path d="M-58 0 A58 58 0 0 1 58 0" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" strokeLinecap="round" />
          <path d="M-58 0 A58 58 0 0 1 41 -41" fill="none" stroke="#FF4D6D" strokeWidth="10" strokeLinecap="round" />
          <text y="-8" textAnchor="middle" fontSize="28" fill="#F5F7FA" fontFamily="Space Grotesk, sans-serif">
            78
          </text>
          <text y="12" textAnchor="middle" fontSize="9" fill="#FF8FA3">
            HIGH
          </text>
        </g>
        {[
          ['Rapid hops', '0.82', '#FF4D6D'],
          ['New wallet', '0.64', '#FF8FA3'],
          ['Known mixer', '0.71', '#FF4D6D'],
          ['Volume spike', '0.33', '#00E5FF'],
        ].map(([k, v, c], i) => (
          <g key={k} transform={`translate(16 ${168 + i * 44})`}>
            <text fontSize="10" fill="#969BA8">
              {k}
            </text>
            <text x="144" textAnchor="end" fontSize="10" fill="#F5F7FA">
              {v}
            </text>
            <rect y="10" width="144" height="4" rx="2" fill="rgba(255,255,255,.06)" />
            <rect y="10" width={144 * Number(v)} height="4" rx="2" fill={c} />
          </g>
        ))}
        <rect x="16" y="418" width="144" height="34" rx="8" fill="rgba(255,77,109,.08)" stroke="rgba(255,77,109,.4)" />
        <text x="88" y="439" textAnchor="middle" fontSize="9.5" fill="#FF8FA3" letterSpacing="1">
          CONCEPT · SAMPLE DATA
        </text>
      </g>
    </svg>
  )
}
