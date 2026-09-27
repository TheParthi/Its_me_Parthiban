import { useEffect, useState } from 'react'
import { ROLE_LABELS, ROLES, type RoleName } from '@pg/shared'
import { useAuth } from '../../lib/auth'
import type { AdminUserRow } from '../../lib/types'
import { Button, Callout, ConfirmDialog, Modal, Select, useToast } from '../../components/ui'
import { ROLE_DESCRIPTIONS, useUserMutations } from './usersApi'

export type UserAction = 'role' | 'toggle' | 'revoke' | 'remove'

export function UserDialogs({ action, target, onClose }: { action: UserAction | null; target: AdminUserRow | null; onClose: () => void }) {
  const { update, remove, revokeSessions } = useUserMutations()
  const toast = useToast()
  const { user } = useAuth()
  const [role, setRole] = useState<RoleName>('EDITOR')

  useEffect(() => {
    if (target && action === 'role') setRole(target.role.name)
  }, [target, action])

  if (!target) return null
  const who = target.name || target.email

  return (
    <>
      <Modal
        open={action === 'role'}
        onClose={onClose}
        size="sm"
        title="Change role"
        description={`${who} · ${target.email}`}
        dismissable={!update.isPending}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={update.isPending}
              disabled={role === target.role.name}
              onClick={() =>
                update.mutate(
                  { id: target.id, role },
                  {
                    onSuccess: () => {
                      toast.success(`${who} is now ${ROLE_LABELS[role]}`)
                      onClose()
                    },
                    onError: (e) => toast.fromError(e, 'Could not change the role'),
                  },
                )
              }
            >
              Save role
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Role"
            value={role}
            onChange={setRole}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r], disabled: r === 'SUPER_ADMIN' && user?.role !== 'SUPER_ADMIN' }))}
            hint={ROLE_DESCRIPTIONS[role]}
          />
          <Callout tone="info">Changing the role signs this person out of all sessions so the new permissions apply immediately.</Callout>
        </div>
      </Modal>

      <ConfirmDialog
        open={action === 'toggle'}
        onClose={onClose}
        tone={target.disabled ? 'primary' : 'danger'}
        title={target.disabled ? `Enable ${who}?` : `Disable ${who}?`}
        description={
          target.disabled
            ? 'They will be able to sign in again with their existing password.'
            : 'They will be signed out everywhere and can’t sign in until re-enabled. Their content and history are kept.'
        }
        confirmLabel={target.disabled ? 'Enable' : 'Disable'}
        onConfirm={() =>
          update.mutateAsync({ id: target.id, disabled: !target.disabled }).then(
            () => {
              toast.success(target.disabled ? 'Account enabled' : 'Account disabled')
              onClose()
            },
            (e) => toast.fromError(e, 'Could not update the account'),
          )
        }
      />

      <ConfirmDialog
        open={action === 'revoke'}
        onClose={onClose}
        title={`Sign ${who} out everywhere?`}
        description={`This revokes ${target.activeSessions} active session${target.activeSessions === 1 ? '' : 's'}. They’ll need to sign in again.`}
        confirmLabel="Revoke sessions"
        onConfirm={() =>
          revokeSessions.mutateAsync(target.id).then(
            (r) => {
              toast.success(`Revoked ${r.revoked} session${r.revoked === 1 ? '' : 's'}`)
              onClose()
            },
            (e) => toast.fromError(e, 'Could not revoke sessions'),
          )
        }
      />

      <ConfirmDialog
        open={action === 'remove'}
        onClose={onClose}
        title={`Remove ${who}?`}
        description="The account is deleted permanently and all of its sessions end. Audit log entries keep the email for history. Consider disabling instead if they may return."
        typeToConfirm={target.email}
        confirmLabel="Remove user"
        onConfirm={() =>
          remove.mutateAsync(target.id).then(
            () => {
              toast.success(`${target.email} removed`)
              onClose()
            },
            (e) => toast.fromError(e, 'Could not remove the user'),
          )
        }
      />
    </>
  )
}
