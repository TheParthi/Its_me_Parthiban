import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { loginSchema } from '@pg/shared'
import { ApiError, errorMessage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { zodErrors, type FieldErrors } from '../../lib/forms'
import { cn } from '../../lib/format'
import { Button, Callout, Checkbox, Input, PasswordInput } from '../../components/ui'
import { AuthLayout } from './AuthLayout'

export default function LoginPage() {
  const { status, login, verify2fa } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [challenge, setChallenge] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to={from} replace />

  const submit = async () => {
    setFormError(null)
    const errs = zodErrors(loginSchema, { email, password, remember })
    if (errs) return setErrors(errs)
    setErrors({})
    setBusy(true)
    try {
      const r = await login(email, password, remember)
      if (r) setChallenge(r.challengeId)
      else navigate(from, { replace: true })
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 429 ? err.message : errorMessage(err, 'Sign-in failed'))
    } finally {
      setBusy(false)
    }
  }

  if (challenge) {
    return (
      <TwoFactorStep
        onBack={() => {
          setChallenge(null)
          setPassword('')
        }}
        onVerify={async (code) => {
          await verify2fa(challenge, code)
          navigate(from, { replace: true })
        }}
      />
    )
  }

  return (
    <AuthLayout title="Sign in" description="Use your administrator account. Access is invitation-only.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-4"
      >
        {formError && (
          <Callout tone="danger" className="py-2.5">
            {formError}
          </Callout>
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password ? 'Enter your password' : null}
          required
          labelAction={
            <Link to="/forgot-password" className="text-xs text-accent-2 hover:underline">
              Forgot password?
            </Link>
          }
        />
        <Checkbox checked={remember} onChange={setRemember} label={<span className="text-[13px] text-muted">Keep me signed in on this device</span>} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

function TwoFactorStep({ onVerify, onBack }: { onVerify: (code: string) => Promise<void>; onBack: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const submit = async (code = digits.join('')) => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code')
    setBusy(true)
    setError(null)
    try {
      await onVerify(code)
    } catch (err) {
      setError(errorMessage(err, 'Incorrect code'))
      setDigits(Array(6).fill(''))
      refs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
    if (d && next.every(Boolean)) submit(next.join(''))
  }

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const onPaste = (e: ClipboardEvent) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!t) return
    e.preventDefault()
    const next = Array.from({ length: 6 }, (_, i) => t[i] ?? '')
    setDigits(next)
    refs.current[Math.min(5, t.length)]?.focus()
    if (t.length === 6) submit(t)
  }

  return (
    <AuthLayout
      title="Two-factor verification"
      description="Enter the 6-digit code from your authenticator app."
      footer={
        <button onClick={onBack} className="inline-flex items-center gap-1 text-muted hover:text-fg">
          <ArrowLeft className="h-3.5 w-3.5" /> Use a different account
        </button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-5"
      >
        <div className="flex items-center justify-center gap-2" onPaste={onPaste} role="group" aria-label="Verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={!!error || undefined}
              className={cn(
                'field-control h-12 w-11 rounded-lg border bg-[#0f121a] text-center font-mono text-lg text-fg focus:border-accent focus:ring-2 focus:ring-accent/30',
                error ? 'border-rose-500/60' : 'border-line-2',
                i === 2 && 'mr-2',
              )}
            />
          ))}
        </div>
        {error && (
          <p className="text-center text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy} icon={<ShieldCheck className="h-4 w-4" />}>
          Verify
        </Button>
      </form>
    </AuthLayout>
  )
}
