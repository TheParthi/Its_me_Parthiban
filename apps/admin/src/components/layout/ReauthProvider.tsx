import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'
import { acceptSession, authApi, errorMessage, setReauthHandler } from '../../lib/api'
import { Button, Modal, PasswordInput } from '../ui'

/**
 * Registers the global password prompt used when the API answers
 * 403 REAUTH_REQUIRED. The original request is retried after success.
 */
export function ReauthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    setReauthHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve
          setPassword('')
          setError(null)
          setOpen(true)
        }),
    )
    return () => setReauthHandler(null)
  }, [])

  const finish = (ok: boolean) => {
    setOpen(false)
    resolver.current?.(ok)
    resolver.current = null
  }

  const submit = async () => {
    if (!password) return setError('Enter your password')
    setBusy(true)
    setError(null)
    try {
      const r = await authApi.reauth(password)
      acceptSession(r)
      setPassword('')
      finish(true)
    } catch (err) {
      setError(errorMessage(err, 'Incorrect password'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {children}
      <Modal
        open={open}
        onClose={() => finish(false)}
        size="sm"
        dismissable={!busy}
        title={
          <span className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-accent-2" /> Confirm it’s you
          </span>
        }
        description="This action is sensitive. Enter your password to continue — you won’t be asked again for a few minutes."
        footer={
          <>
            <Button variant="ghost" onClick={() => finish(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={busy}>
              Confirm
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} data-autofocus />
        </form>
      </Modal>
    </>
  )
}
