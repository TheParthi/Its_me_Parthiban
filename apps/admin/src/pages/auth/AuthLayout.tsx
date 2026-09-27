import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn } from '../../lib/format'

export function AuthLayout({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(600px circle at 20% 10%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(500px circle at 85% 90%, rgba(0,213,255,0.08), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[400px]"
      >
        <div className="mb-8 flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-line-2 bg-[#161a25]">
            <span className="absolute inset-0 bg-gradient-to-br from-accent/40 to-accent-2/30" />
            <span className="relative font-display text-sm font-bold text-white">P</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold text-fg">Portfolio Control Center</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">Administrators only</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-card/90 p-6 shadow-2xl shadow-black/40 sm:p-7">
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-1.5 text-[13px] text-muted">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-[13px] text-muted">{footer}</div>}
      </motion.main>
    </div>
  )
}

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'An upper-case letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lower-case letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
]

/** Live checklist mirroring `passwordSchema` in @pg/shared. */
export function PasswordRules({ password, confirm }: { password: string; confirm?: string }) {
  const rules = confirm === undefined ? RULES : [...RULES, { label: 'Passwords match', test: (p: string) => !!p && p === confirm }]
  const score = RULES.filter((r) => r.test(password)).length + (password.length >= 16 ? 1 : 0)
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? (score <= 2 ? 'bg-rose-400' : score <= 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/10',
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rules.map((r) => {
          const ok = r.test(password)
          return (
            <li key={r.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-300' : 'text-muted')}>
              {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5 text-dim" aria-hidden />}
              {r.label}
              <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
