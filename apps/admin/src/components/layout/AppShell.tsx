import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, KeyRound, LogOut, Menu as MenuIcon, ShieldAlert, ShieldCheck, UserRound, X } from 'lucide-react'
import { ROLE_LABELS } from '@pg/shared'
import { useAuth, useUser } from '../../lib/auth'
import { cn } from '../../lib/format'
import { usePreviewWebsite } from '../preview/PreviewFrame'
import { Button, Menu, PageSkeleton, useFocusTrap } from '../ui'
import { visibleNav } from './nav'
import { GlobalSearch, HealthPill, NotificationsBell, QuickCreate } from './TopBarWidgets'

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-line-2 bg-[#161a25]">
        <span className="absolute inset-0 bg-gradient-to-br from-accent/40 to-accent-2/30" />
        <span className="relative font-display text-sm font-bold text-white">P</span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-display text-[14px] font-semibold text-fg">Control Center</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-dim">Portfolio admin</span>
      </span>
    </Link>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser()
  const groups = visibleNav(user.permissions)
  return (
    <nav aria-label="Main" className="scroll-thin flex-1 overflow-y-auto px-3 pb-6">
      {groups.map((g) => (
        <div key={g.label} className="mt-5 first:mt-2">
          <p className="eyebrow mb-1.5 px-2.5 text-[10px] text-dim">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
                      isActive ? 'bg-white/[0.07] text-fg' : 'text-muted hover:bg-white/[0.04] hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-active" className="absolute left-0 top-2 h-5 w-0.5 rounded-full bg-gradient-to-b from-accent to-accent-2" />}
                      <it.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-2' : 'text-dim group-hover:text-muted')} />
                      <span className="truncate">{it.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserMenu() {
  const user = useUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <Menu
      label="Account"
      width="w-60"
      header={
        <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
          <p className="truncate text-[13px] font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-accent-2">{ROLE_LABELS[user.role]}</p>
        </div>
      }
      items={[
        { label: 'Account & 2FA', icon: <UserRound className="h-4 w-4" />, onSelect: () => navigate('/account') },
        { label: 'Change password', icon: <KeyRound className="h-4 w-4" />, onSelect: () => navigate('/account#password') },
        { label: 'Sign out', icon: <LogOut className="h-4 w-4" />, danger: true, separatorBefore: true, onSelect: () => void logout().then(() => navigate('/login')) },
      ]}
      trigger={(p) => (
        <button
          {...p}
          className="grid h-9 w-9 place-items-center rounded-full border border-line-2 bg-gradient-to-br from-accent/30 to-accent-2/20 font-display text-xs font-semibold text-white hover:border-white/30"
          aria-label={`Account menu for ${user.name}`}
        >
          {initials || '?'}
        </button>
      )}
    />
  )
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            data-overlay-layer
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-sidebar"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Brand />
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close navigation">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function AppShell() {
  const [drawer, setDrawer] = useState(false)
  const user = useUser()
  const preview = usePreviewWebsite()
  const location = useLocation()

  useEffect(() => {
    setDrawer(false)
    document.getElementById('main')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only z-[100] rounded bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-4">
          <Brand />
        </div>
        <SidebarNav />
        <div className="border-t border-line px-4 py-3">
          <p className="font-mono text-[10px] text-dim">
            Signed in as <span className="text-muted">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>
      </aside>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer}>
              <MenuIcon className="h-5 w-5" />
            </Button>
            <GlobalSearch />
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <HealthPill />
              {/* Wrappers carry the breakpoint: Button's own display class would override `hidden`. */}
              <span className="hidden md:block">
                <Button variant="secondary" size="sm" onClick={preview.open} loading={preview.pending} icon={<ExternalLink className="h-3.5 w-3.5" />}>
                  Preview website
                </Button>
              </span>
              <span className="md:hidden">
                <Button variant="ghost" size="icon" onClick={preview.open} aria-label="Preview website">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </span>
              <QuickCreate />
              <NotificationsBell />
              <UserMenu />
            </div>
          </div>
          {user.mustEnable2fa && (
            <div className="flex flex-wrap items-center gap-2 border-t border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-[13px] text-amber-100 sm:px-6 lg:px-8" role="alert">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
              <span>Two-factor authentication is required for administrators. Set it up to keep access.</span>
              <Link to="/account#2fa" className="ml-auto inline-flex items-center gap-1 font-medium text-amber-200 underline underline-offset-2 hover:text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> Set up 2FA
              </Link>
            </div>
          )}
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
          <Suspense fallback={<PageSkeleton />}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
