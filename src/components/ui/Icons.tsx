// Brand marks that lucide-react no longer ships.

export function GitHubIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function LinkedInIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

/** Animated "PG" monogram: strokes draw in, then a cyan dot orbits. */
export function Monogram({ size = 36, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#101218" stroke="rgba(255,255,255,.12)" />
      <path
        d="M18 46V18h11a8 8 0 0 1 0 16H18"
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="4"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        className={animate ? 'monogram-draw' : ''}
      />
      <path
        d="M48 24a10 10 0 1 0 0 16v-7h-6"
        fill="none"
        stroke="#00E5FF"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        className={animate ? 'monogram-draw monogram-draw--late' : ''}
      />
      <style>{`
        .monogram-draw { stroke-dashoffset: 1; animation: mg-draw 1.4s cubic-bezier(.16,1,.3,1) .2s forwards; }
        .monogram-draw--late { animation-delay: .6s; }
        @keyframes mg-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .monogram-draw { stroke-dashoffset: 0; animation: none; } }
      `}</style>
    </svg>
  )
}
