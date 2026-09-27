import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { changePasswordSchema } from '@pg/shared'
import { authApi, errorMessage } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { serverErrors, zodErrors, type FieldErrors } from '../../lib/forms'
import { Button, Card, CardHeader, PasswordInput, useToast } from '../../components/ui'
import { PasswordRules } from '../auth/AuthLayout'

export function ChangePasswordCard() {
  const toast = useToast()
  const user = useUser()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const errs: FieldErrors = zodErrors(changePasswordSchema, { currentPassword: current, newPassword: next }) ?? {}
    if (next && confirm !== next) errs.confirm = 'Passwords don’t match'
    if (next && next === current) errs.newPassword = 'Choose a password different from your current one'
    if (Object.keys(errs).length) return setErrors(errs)
    setErrors({})
    setBusy(true)
    try {
      await authApi.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      toast.success('Password changed', 'Your other sessions were signed out. This device stays signed in.')
    } catch (e) {
      const se = serverErrors(e)
      if (se) setErrors(se)
      else if (/current password/i.test(errorMessage(e))) setErrors({ currentPassword: errorMessage(e) })
      else toast.fromError(e, 'Could not change your password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card id="password" className="scroll-mt-24">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted" /> Change password
          </span>
        }
        description="Changing your password signs out all your other sessions."
      />
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {/* Hidden username helps password managers pair the new password with the account. */}
        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <PasswordInput label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.currentPassword} required />
        <PasswordInput label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.newPassword} required />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} required />
        {next && <PasswordRules password={next} confirm={confirm} />}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={busy} disabled={!current || !next || !confirm}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  )
}
