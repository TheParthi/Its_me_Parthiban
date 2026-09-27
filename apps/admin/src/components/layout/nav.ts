import type { ComponentType } from 'react'
import {
  Briefcase,
  ChartArea,
  FolderKanban,
  GraduationCap,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  MousePointerClick,
  Palette,
  PencilRuler,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import type { Permission } from '@pg/shared'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** All listed permissions are required to show the item. */
  perms?: Permission[]
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Overview', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Content',
    items: [
      { to: '/portfolio', label: 'Portfolio Editor', icon: PencilRuler, perms: ['content:read'] },
      { to: '/projects', label: 'Projects', icon: FolderKanban, perms: ['content:read'] },
      { to: '/profile', label: 'Profile', icon: UserRound, perms: ['content:read'] },
      { to: '/skills', label: 'Skills', icon: Sparkles, perms: ['content:read'] },
      { to: '/experience', label: 'Experience', icon: Briefcase, perms: ['content:read'] },
      { to: '/education', label: 'Education', icon: GraduationCap, perms: ['content:read'] },
      { to: '/media', label: 'Media Library', icon: Images, perms: ['media:read'] },
    ],
  },
  {
    label: 'Site',
    items: [
      { to: '/appearance', label: 'Website Appearance', icon: Palette, perms: ['content:read'] },
      { to: '/homepage', label: 'Homepage Builder', icon: LayoutTemplate, perms: ['content:read'] },
      { to: '/seo', label: 'SEO Settings', icon: Search, perms: ['content:read'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/analytics/visitors', label: 'Visitor Analytics', icon: ChartArea, perms: ['analytics:read'] },
      { to: '/analytics/engagement', label: 'Engagement Analytics', icon: MousePointerClick, perms: ['analytics:read'] },
      { to: '/messages', label: 'Contact Messages', icon: Inbox, perms: ['messages:read'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', label: 'User Management', icon: Users, perms: ['users:read'] },
      { to: '/security', label: 'Security', icon: Shield, perms: ['security:read'] },
      { to: '/activity', label: 'Activity Logs', icon: ScrollText, perms: ['audit:read'] },
      { to: '/settings', label: 'Settings', icon: Settings, perms: ['settings:read'] },
    ],
  },
]

export const hasAll = (perms: readonly string[] | undefined, need?: Permission[]) => !need || need.every((p) => perms?.includes(p))

export function visibleNav(perms: readonly string[] | undefined): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => hasAll(perms, i.perms)) })).filter((g) => g.items.length)
}

