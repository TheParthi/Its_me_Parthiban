import { useState } from 'react'
import { Check, Copy, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { authApi, errorMessage, updateUser } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { copyText } from '../../lib/format'
import { Badge, Button, Callout, Card, CardHeader, ConfirmDialog, Input, useToast } from '../../components/ui'

type Setup = { qr: string; secret: string; otpauth: string }

export function TwoFactorCard() {
  const user = useUser()
  const toast = useToast()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const [copied, setCopied] = useState(false)

  const start = async () => {
    setBusy(true)
    try {
      setSetup(await authApi.setup2fa())
      setCode('')
      setCodeError(null)
    } catch (e) {
      toast.fromError(e, 'Could not start two-factor setup')
    } finally {
      setBusy(false)
    }
  }

  const enable = async () => {
    if (!/^\d{6}$/.test(code)) return setCodeError('Enter the 6-digit code from your app')
    setBusy(true)
    setCodeError(null)
    try {
      updateUser(await authApi.enable2fa(code))
      setSetup(null)
      setCode('')
      toast.success('Two-factor authentication is on', 'You’ll be asked for a code each time you sign in.')
    } catch (e) {
      setCodeError(errorMessage(e, 'Incorrect code'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card id="2fa" className="scroll-mt-24">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted" /> Two-factor authentication
          </span>
        }
        description="Protect your account with a code from an authenticator app (1Password, Authy, Google Authenticator…)."
        actions={user.twoFactorEnabled ? <Badge tone="emerald" dot>on</Badge> : <Badge tone="amber" dot>off</Badge>}
      />

      {user.twoFactorEnabled ? (
        <div className="space-y-4">
          <Callout tone="success" icon={<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />} title="Your account is protected">
            Signing in requires your password and a 6-digit code from your authenticator app.
          </Callout>
          <Button variant="danger" icon={<ShieldOff className="h-4 w-4" />} onClick={() => setConfirmOff(true)}>
            Turn off two-factor
          </Button>
        </div>
      ) : setup ? (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto self-start rounded-xl bg-white p-2 sm:mx-0">
            <img src={setup.qr} alt="QR code for your authenticator app" width={176} height={176} className="h-44 w-44" />
          </div>
          <form
            noValidate
            className="min-w-0 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              enable()
            }}
          >
            <ol className="list-decimal space-y-1 pl-4 text-[13px] text-muted">
              <li>Scan the QR code with your authenticator app.</li>
              <li>Or enter this key manually:</li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-[#0f121a] px-3 py-2 font-mono text-xs tracking-wider text-fg">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
              <Button
                size="icon-sm"
                aria-label="Copy setup key"
                onClick={async () => {
                  setCopied(await copyText(setup.secret))
                }}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="font-mono tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={codeError}
              autoFocus
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setSetup(null)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy} disabled={code.length !== 6}>
                Verify & turn on
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {user.mustEnable2fa && (
            <Callout tone="warning" title="Two-factor is required">
              Your organisation requires two-factor authentication for all administrators.
            </Callout>
          )}
          <Button variant="primary" icon={<ShieldCheck className="h-4 w-4" />} loading={busy} onClick={start}>
            Set up two-factor
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        title="Turn off two-factor?"
        description="Your account will be protected by your password only. If your organisation requires two-factor, you’ll be asked to set it up again. This is recorded in the security log."
        confirmLabel="Turn off"
        onConfirm={async () => {
          try {
            updateUser(await authApi.disable2fa())
            setConfirmOff(false)
            toast.success('Two-factor authentication is off')
          } catch (e) {
            toast.fromError(e, 'Could not turn off two-factor')
          }
        }}
      />
    </Card>
  )
}
