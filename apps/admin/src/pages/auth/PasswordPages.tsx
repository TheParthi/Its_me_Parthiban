import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { forgotPasswordSchema, passwordSchema } from '@pg/shared'
import { authApi, errorMessage } from '../../lib/api'
import { zodErrors } from '../../lib/forms'
import { Button, Callout, Input, PasswordInput, useToast } from '../../components/ui'
import { AuthLayout, PasswordRules } from './AuthLayout'

const backToLogin = (
  <Link to="/login" className="inline-flex items-center gap-1 hover:text-fg">
    <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
  </Link>
)

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const errs = zodErrors(forgotPasswordSchema, { email })
    if (errs) return setError(errs.email ?? 'Enter a valid email')
    setBusy(true)
    setError(null)
    try {
      await authApi.forgot(email)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" description="We’ll email a reset link that works for 30 minutes." footer={backToLogin}>
      {sent ? (
        <Callout tone="success" icon={<MailCheck className="mt-0.5 h-4 w-4 shrink-0" />} title="Check your inbox">
          If an administrator account exists for <strong>{email}</strong>, a reset link is on its way. If email isn’t configured on the server, ask a Super Admin to reset your access.
        </Callout>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-4"
        >
          <Input label="Email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

function SetPasswordForm({
  token,
  submitLabel,
  onSubmit,
}: {
  token: string | null
  submitLabel: string
  onSubmit: (token: string, password: string) => Promise<unknown>
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!token || token.length < 20) {
    return (
      <Callout tone="danger" title="This link is incomplete">
        Open the link from your email again, or ask for a new one.
      </Callout>
    )
  }

  const submit = async () => {
    const r = passwordSchema.safeParse(password)
    if (!r.success) return setError(r.error.issues[0]?.message ?? 'Choose a stronger password')
    if (password !== confirm) return setError('The passwords do not match')
    setBusy(true)
    setError(null)
    try {
      await onSubmit(token, password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="space-y-4"
    >
      {error && <Callout tone="danger">{error}</Callout>}
      <PasswordInput label="New password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
      <PasswordInput label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <PasswordRules password={password} confirm={confirm} />
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <AuthLayout title="Choose a new password" description="All other sessions will be signed out." footer={backToLogin}>
      <SetPasswordForm
        token={params.get('token')}
        submitLabel="Update password"
        onSubmit={async (token, password) => {
          await authApi.reset(token, password)
          toast.success('Password updated', 'Sign in with your new password.')
          navigate('/login', { replace: true })
        }}
      />
    </AuthLayout>
  )
}

export function AcceptInvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <AuthLayout title="Accept your invitation" description="Set a password to activate your administrator account. Long passphrases are welcome." footer={backToLogin}>
      <SetPasswordForm
        token={params.get('token')}
        submitLabel="Activate account"
        onSubmit={async (token, password) => {
          await authApi.acceptInvite(token, password)
          toast.success('Account activated', 'You can sign in now.')
          navigate('/login', { replace: true })
        }}
      />
    </AuthLayout>
  )
}
