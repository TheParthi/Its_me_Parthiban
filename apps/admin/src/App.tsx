import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShieldOff } from 'lucide-react'
import type { Permission } from '@pg/shared'
import { ApiError } from './lib/api'
import { AuthProvider, useAuth } from './lib/auth'
import { AppShell } from './components/layout/AppShell'
import { hasAll } from './components/layout/nav'
import { ReauthProvider } from './components/layout/ReauthProvider'
import { EmptyState, PageSkeleton, ToastProvider } from './components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      // Retry transient failures only; 4xx answers are final.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
  mutationCache: new MutationCache(),
})

const page = (f: () => Promise<{ default: ComponentType }>) => lazy(f)
const Login = page(() => import('./pages/auth/Login'))
const Forgot = lazy(() => import('./pages/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage })))
const Reset = lazy(() => import('./pages/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage })))
const Accept = lazy(() => import('./pages/auth/PasswordPages').then((m) => ({ default: m.AcceptInvitePage })))

const Overview = page(() => import('./pages/overview/OverviewPage'))
const Portfolio = page(() => import('./pages/portfolio/PortfolioEditorPage'))
const Projects = page(() => import('./pages/projects/ProjectsPage'))
const NewProject = page(() => import('./pages/projects/NewProjectPage'))
const ProjectEditor = page(() => import('./pages/projects/ProjectEditorPage'))
const Profile = page(() => import('./pages/profile/ProfilePage'))
const Skills = page(() => import('./pages/skills/SkillsPage'))
const Experience = page(() => import('./pages/experience/ExperiencePage'))
const Education = page(() => import('./pages/education/EducationPage'))
const Media = page(() => import('./pages/media/MediaLibraryPage'))
const Appearance = page(() => import('./pages/appearance/AppearancePage'))
const Homepage = page(() => import('./pages/homepage/HomepageBuilderPage'))
const Seo = page(() => import('./pages/seo/SeoPage'))
const Visitors = page(() => import('./pages/analytics/VisitorAnalyticsPage'))
const Engagement = page(() => import('./pages/analytics/EngagementAnalyticsPage'))
const Messages = page(() => import('./pages/messages/MessagesPage'))
const Users = page(() => import('./pages/users/UsersPage'))
const Security = page(() => import('./pages/security/SecurityPage'))
const Activity = page(() => import('./pages/activity/ActivityLogsPage'))
const Settings = page(() => import('./pages/settings/SettingsPage'))
const Account = page(() => import('./pages/account/AccountPage'))

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
    </div>
  )
}

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <AppShell />
}

function GuestOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <FullScreenLoader />
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Outlet />
    </Suspense>
  )
}

/** Cosmetic gate — the API enforces every permission regardless. */
function Gate({ perms, children }: { perms?: Permission[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!hasAll(user?.permissions, perms))
    return (
      <EmptyState
        icon={<ShieldOff className="h-5 w-5" />}
        title="You don’t have access to this page"
        description={`It needs the ${perms?.join(', ')} permission${perms && perms.length > 1 ? 's' : ''}. Ask a Super Admin if you need it.`}
      />
    )
  return <>{children}</>
}

const g = (C: LazyExoticComponent<ComponentType>, perms?: Permission[]) => (
  <Gate perms={perms}>
    <C />
  </Gate>
)

function NotFound() {
  return <EmptyState title="Page not found" description="The page you’re looking for doesn’t exist." />
}

const router = createBrowserRouter(
  [
    {
      element: <GuestOnly />,
      children: [
        { path: '/login', element: <Login /> },
        { path: '/forgot-password', element: <Forgot /> },
        { path: '/reset-password', element: <Reset /> },
        { path: '/accept-invite', element: <Accept /> },
      ],
    },
    {
      element: <RequireAuth />,
      children: [
        { index: true, element: g(Overview) },
        { path: 'portfolio', element: g(Portfolio, ['content:read']) },
        { path: 'projects', element: g(Projects, ['content:read']) },
        { path: 'projects/new', element: g(NewProject, ['content:write']) },
        { path: 'projects/:id', element: g(ProjectEditor, ['content:read']) },
        { path: 'profile', element: g(Profile, ['content:read']) },
        { path: 'skills', element: g(Skills, ['content:read']) },
        { path: 'experience', element: g(Experience, ['content:read']) },
        { path: 'education', element: g(Education, ['content:read']) },
        { path: 'media', element: g(Media, ['media:read']) },
        { path: 'appearance', element: g(Appearance, ['content:read']) },
        { path: 'homepage', element: g(Homepage, ['content:read']) },
        { path: 'seo', element: g(Seo, ['content:read']) },
        { path: 'analytics/visitors', element: g(Visitors, ['analytics:read']) },
        { path: 'analytics/engagement', element: g(Engagement, ['analytics:read']) },
        { path: 'messages', element: g(Messages, ['messages:read']) },
        { path: 'users', element: g(Users, ['users:read']) },
        { path: 'security', element: g(Security, ['security:read']) },
        { path: 'activity', element: g(Activity, ['audit:read']) },
        { path: 'settings', element: g(Settings, ['settings:read']) },
        { path: 'account', element: g(Account) },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename: '/admin' },
)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <ReauthProvider>
            <Suspense fallback={<PageSkeleton />}>
              <RouterProvider router={router} />
            </Suspense>
          </ReauthProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
