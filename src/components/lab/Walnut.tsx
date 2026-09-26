import type { WalnutSample } from './walnutSamples'

/** Hand-drawn SVG walnut. Under UV, risky nuts show a bright-green fluorescence cue. */
export function Walnut({ x, y, r, rot, grade, uv = false }: WalnutSample & { uv?: boolean }) {
  const shell = uv ? '#4a3a6e' : '#a8793f'
  const shade = uv ? '#2f2350' : '#7a5328'
  const line = uv ? '#8f7cc7' : '#5e3f1d'
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse rx={r} ry={r * 0.82} fill={shade} />
      <ellipse rx={r * 0.94} ry={r * 0.76} cx={-2} cy={-2} fill={shell} />
      <path d={`M0 ${-r * 0.78} C ${r * 0.08} ${-r * 0.3} ${-r * 0.08} ${r * 0.3} 0 ${r * 0.78}`} stroke={line} strokeWidth="2" fill="none" />
      <g stroke={line} strokeWidth="1.2" fill="none" opacity=".75">
        <path d={`M${-r * 0.7} ${-r * 0.2} q ${r * 0.2} ${-r * 0.25} ${r * 0.45} ${-r * 0.1} t ${r * 0.1} ${r * 0.3}`} />
        <path d={`M${-r * 0.6} ${r * 0.3} q ${r * 0.25} ${-r * 0.1} ${r * 0.4} ${r * 0.12}`} />
        <path d={`M${r * 0.2} ${-r * 0.5} q ${r * 0.25} ${r * 0.05} ${r * 0.35} ${r * 0.3} t ${r * 0.1} ${r * 0.35}`} />
        <path d={`M${r * 0.25} ${r * 0.35} q ${r * 0.2} ${-r * 0.2} ${r * 0.4} ${-r * 0.05}`} />
      </g>
      {uv && grade === 'Risk' && (
        <g opacity=".85">
          <ellipse cx={r * 0.25} cy={-r * 0.1} rx={r * 0.32} ry={r * 0.22} fill="#b8ff5c" opacity=".55" />
          <ellipse cx={-r * 0.3} cy={r * 0.3} rx={r * 0.18} ry={r * 0.12} fill="#b8ff5c" opacity=".4" />
        </g>
      )}
      {uv && grade === 'B' && <ellipse cx={-r * 0.2} cy={-r * 0.25} rx={r * 0.14} ry={r * 0.1} fill="#d6ff9c" opacity=".3" />}
    </g>
  )
}
