import { walnutSamples } from '../lab/walnutSamples'
import { Walnut } from '../lab/Walnut'

// Laboratory-style Walnut AI dashboard: UV-lit tray, scan line, detection
// boxes and a device monitor. Sample data, illustrative only.

export function VisionPreview() {
  return (
    <svg viewBox="0 0 800 520" className="h-full w-full" role="img" aria-label="Illustration of a UV imaging and detection dashboard with sample data">
      <defs>
        <radialGradient id="vp-uv" cx=".5" cy=".5" r=".7">
          <stop offset="0" stopColor="#2a1450" />
          <stop offset="1" stopColor="#0b0716" />
        </radialGradient>
        <linearGradient id="vp-scan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#B388FF" stopOpacity="0" />
          <stop offset=".5" stopColor="#B388FF" stopOpacity=".55" />
          <stop offset="1" stopColor="#B388FF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="vp-clip">
          <rect x="24" y="24" width="520" height="472" rx="16" />
        </clipPath>
      </defs>
      <rect width="800" height="520" fill="#07060c" />

      {/* Imaging viewport */}
      <g clipPath="url(#vp-clip)">
        <rect x="24" y="24" width="520" height="472" fill="url(#vp-uv)" />
        <g transform="translate(24 24) scale(1.3)">
          {walnutSamples.map((w) => (
            <Walnut key={w.id} {...w} uv />
          ))}
          {walnutSamples.map((w) => {
            const c = w.grade === 'Risk' ? '#FF4D6D' : w.grade === 'B' ? '#FFD166' : '#34D399'
            return (
              <g key={w.id} fontFamily="JetBrains Mono, monospace">
                <rect x={w.x - w.r - 6} y={w.y - w.r - 6} width={(w.r + 6) * 2} height={(w.r + 6) * 2} fill="none" stroke={c} strokeWidth="1.3" rx="3" />
                <rect x={w.x - w.r - 6} y={w.y - w.r - 19} width={74} height="13" fill={c} />
                <text x={w.x - w.r - 3} y={w.y - w.r - 9.5} fontSize="8.5" fill="#07060c">
                  {`${w.grade === 'Risk' ? 'RISK' : 'GRADE ' + w.grade} ${w.conf.toFixed(2)}`}
                </text>
              </g>
            )
          })}
        </g>
        <rect x="24" y="24" width="520" height="80" fill="url(#vp-scan)" className="scan" style={{ ['--scan-dist' as string]: '392px' }} />
      </g>
      <rect x="24" y="24" width="520" height="472" rx="16" fill="none" stroke="rgba(179,136,255,.25)" />
      <g fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c9b8ff">
        <text x="40" y="48">UV-365nm · CAM-01</text>
        <text x="528" y="48" textAnchor="end">
          REC ●
        </text>
      </g>

      {/* Monitor */}
      <g transform="translate(564 24)" fontFamily="JetBrains Mono, monospace">
        <rect width="212" height="472" rx="16" fill="#0d0b14" stroke="rgba(255,255,255,.08)" />
        <text x="18" y="32" fontSize="10" fill="#969BA8" letterSpacing="1.5">
          DEVICE MONITOR
        </text>
        {[
          ['Status', 'online', '#34D399'],
          ['Model', 'YOLOv8', '#F5F7FA'],
          ['Frame', '24 fps', '#F5F7FA'],
          ['Actuator', 'ready', '#34D399'],
        ].map(([k, v, c], i) => (
          <g key={k} transform={`translate(18 ${60 + i * 26})`} fontSize="11">
            <text fill="#969BA8">{k}</text>
            <text x="176" textAnchor="end" fill={c}>
              {v}
            </text>
          </g>
        ))}
        <line x1="18" x2="194" y1="168" y2="168" stroke="rgba(255,255,255,.08)" />
        <text x="18" y="194" fontSize="10" fill="#969BA8" letterSpacing="1.5">
          THIS BATCH
        </text>
        {[
          ['Grade A', 5, '#34D399'],
          ['Grade B', 2, '#FFD166'],
          ['Risk flag', 1, '#FF4D6D'],
        ].map(([k, v, c], i) => (
          <g key={k as string} transform={`translate(18 ${214 + i * 34})`} fontSize="11">
            <text fill="#F5F7FA">{k}</text>
            <text x="176" textAnchor="end" fill={c as string}>
              {v}
            </text>
            <rect y="10" width="176" height="4" rx="2" fill="rgba(255,255,255,.06)" />
            <rect y="10" width={(176 * (v as number)) / 8} height="4" rx="2" fill={c as string} />
          </g>
        ))}
        {/* Inference sparkline */}
        <text x="18" y="340" fontSize="10" fill="#969BA8" letterSpacing="1.5">
          INFERENCE ms
        </text>
        <polyline
          points="18,410 40,396 62,402 84,380 106,390 128,372 150,384 172,368 194,376"
          fill="none"
          stroke="#B388FF"
          strokeWidth="1.8"
        />
        <text x="106" y="452" textAnchor="middle" fontSize="9" fill="#7d7496" letterSpacing="1">
          SAMPLE DATA · ILLUSTRATIVE
        </text>
      </g>
    </svg>
  )
}
