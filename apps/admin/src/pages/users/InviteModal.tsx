import { useState } from 'react'
import { Check, Copy, MailCheck } from 'lucide-react'
import { inviteUserSchema, ROLE_LABELS, ROLES, type RoleName } from '@pg/shared'
import { useAuth } from '../../lib/auth'
import { copyText } from '../../lib/format'
import { serverErrors, zodErrors, type FieldErrors } from '../../lib/forms'
import type { InviteResult } from '../../lib/types'
import { Button, Callout, Input, Modal, Select, useToast } from '../../components/ui'
import { ROLE_DESCRIPTIONS, useUserMutations } from './usersApi'

export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { invite } = useUserMutations()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<RoleName>('EDITOR')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const close = () => {
    onClose()
    setTimeout(() => {
      setEmail('')
      setName('')
      setRole('EDITOR')
      setErrors({})
      setResult(null)
      setCopied(false)
    }, 250)
  }

  const submit = () => {
    const body = { email, name, role }
    const errs = zodErrors(inviteUserSchema, body)
    if (errs) return setErrors(errs)
    setErrors({})
    invite.mutate(body, {
      onSuccess: (r) => {
        setResult(r)
        toast.success(r.emailSent ? `Invitation emailed to ${email.trim()}` : 'Invitation created')
      },
      onError: (e) => {
        const se = serverErrors(e)
        if (se) setErrors(se)
        else toast.fromError(e, 'Could not send the invitation')
      },
    })
  }

  const roleOptions = ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
    disabled: r === 'SUPER_ADMIN' && user?.role !== 'SUPER_ADMIN',
  }))

  return (
    <Modal
      open={open}
      onClose={close}
      title={result ? 'Invitation created' : 'Invite an administrator'}
      description={result ? undefined : 'They’ll set their own password from a one-time link valid for 72 hours.'}
      dismissable={!invite.isPending}
      footer={
        result ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={invite.isPending}>
              Send invitation
            </Button>
          </>
        )
      }
    >
      {result ? (
        result.emailSent || !result.inviteLink ? (
          <Callout tone="success" icon={<MailCheck className="mt-0.5 h-4 w-4 shrink-0" />} title="Invitation sent">
            An email with a sign-up link is on its way to {email.trim()}.
          </Callout>
        ) : (
          <div className="space-y-3">
            <Callout tone="warning" title="Email isn’t configured — share this link yourself">
              This link is shown only once. Send it through a private channel; anyone with it can set the password for this account.
            </Callout>
            <div className="flex gap-2">
              <input readOnly value={result.inviteLink} aria-label="Invitation link" onFocus={(e) => e.target.select()} className="field-control h-9 min-w-0 flex-1 rounded-lg border border-line bg-[#0f121a] px-3 font-mono text-xs text-fg" />
              <Button
                icon={copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                onClick={async () => {
                  const ok = await copyText(result.inviteLink!)
                  setCopied(ok)
                  if (ok) toast.success('Link copied')
                  else toast.error('Copy failed', 'Select the link and copy it manually.')
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Input label="Email" type="email" autoComplete="off" data-autofocus value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
          <Input label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={errors.name} required />
          <Select label="Role" value={role} options={roleOptions} onChange={setRole} error={errors.role} hint={ROLE_DESCRIPTIONS[role]} />
          <ul className="space-y-1.5 rounded-lg border border-line bg-white/[0.02] p-3 text-xs text-muted">
            {ROLES.map((r) => (
              <li key={r}>
                <span className="font-medium text-[#d5d9e1]">{ROLE_LABELS[r]}</span> — {ROLE_DESCRIPTIONS[r]}
              </li>
            ))}
          </ul>
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  )
}
