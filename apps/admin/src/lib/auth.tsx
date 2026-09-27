import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { can as canPerm, type AuthUser, type LoginResponse, type Permission } from '@pg/shared'
import { acceptSession, authApi, clearSession, onSession, refreshSession, setUnauthorizedHandler } from './api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: AuthUser | null
  /** Resolves with the challenge id when a 2FA code is needed. */
  login: (email: string, password: string, remember: boolean) => Promise<{ challengeId: string } | null>
  verify2fa: (challengeId: string, code: string) => Promise<void>
  logout: () => Promise<void>
  can: (p: Permission) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const qc = useQueryClient()

  useEffect(() => {
    const off = onSession((u) => {
      setUser(u)
      setStatus(u ? 'authenticated' : 'anonymous')
      if (!u) qc.clear()
    })
    setUnauthorizedHandler(() => setStatus('anonymous'))
    // Restore the session from the HttpOnly refresh cookie.
    refreshSession()
      .then((ok) => {
        if (!ok) setStatus('anonymous')
      })
      .catch(() => setStatus('anonymous'))
    return () => {
      off()
      setUnauthorizedHandler(null)
    }
  }, [qc])

  const finish = useCallback((r: LoginResponse) => {
    if (r.status === 'ok') {
      acceptSession(r)
      return null
    }
    return { challengeId: r.challengeId }
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => finish(await authApi.login(email, password, remember)),
    [finish],
  )

  const verify2fa = useCallback(
    async (challengeId: string, code: string) => {
      finish(await authApi.verify2fa(challengeId, code))
    },
    [finish],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, verify2fa, logout, can: (p) => canPerm(user?.permissions, p) }),
    [status, user, login, verify2fa, logout],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** The signed-in user; only use inside the authenticated shell. */
export function useUser(): AuthUser {
  const { user } = useAuth()
  if (!user) throw new Error('useUser without a session')
  return user
}

export function useCan() {
  return useAuth().can
}
