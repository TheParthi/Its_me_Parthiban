import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, Server } from 'lucide-react'
import { Badge, Card, CardHeader, ErrorState, KeyValue, SkeletonRows } from '../../components/ui'
import { Mono } from '../../components/admin/shared'
import { useSystemInfo } from './settingsApi'

function Status({ ok, yes = 'Configured', no = 'Not configured' }: { ok: boolean; yes?: string; no?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-300">
      <CircleCheck className="h-4 w-4" aria-hidden /> {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-amber-300">
      <CircleDashed className="h-4 w-4" aria-hidden /> {no}
    </span>
  )
}

function EnvList({ vars }: { vars: [string, string][] }) {
  return (
    <ul className="mt-2 space-y-1">
      {vars.map(([k, d]) => (
        <li key={k} className="flex flex-wrap gap-x-2 text-xs">
          <Mono className="text-violet-200">{k}</Mono>
          <span className="text-muted">{d}</span>
        </li>
      ))}
    </ul>
  )
}

function Guide({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-line bg-white/[0.02] px-3 py-2.5">
      <summary className="cursor-pointer select-none text-[13px] font-medium text-[#d5d9e1]">{title}</summary>
      <div className="mt-2 text-xs leading-relaxed text-muted">{children}</div>
    </details>
  )
}

/** Integration status. The API reports presence only — secrets are never sent to or entered in the browser. */
export function SystemPanel() {
  const q = useSystemInfo()
  const d = q.data
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted" /> System
          </span>
        }
        description="Integrations configured on the server. Secrets live in server environment variables and are never shown here."
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !d ? (
        <SkeletonRows rows={5} />
      ) : (
        <div className="space-y-5">
          <KeyValue
            items={[
              ['Environment', <Badge key="e" tone={d.environment === 'production' ? 'emerald' : 'amber'}>{d.environment}</Badge>],
              [
                'Media storage',
                <span key="s" className="flex flex-wrap items-center gap-2">
                  <Mono>{d.storage.driver}</Mono>
                  <Status ok={d.storage.configured} />
                </span>,
              ],
              ...(d.storage.bucket || d.storage.region
                ? ([['Bucket / region', <Mono key="b">{[d.storage.bucket, d.storage.region].filter(Boolean).join(' · ')}</Mono>]] as [ReactNode, ReactNode][])
                : []),
              ['Email (SMTP)', <Status key="m" ok={d.email.configured} />],
              ...(d.email.from ? ([['Sender', <Mono key="f">{d.email.from}</Mono>]] as [ReactNode, ReactNode][]) : []),
              ['Public site', <a key="p" href={d.publicSiteUrl} target="_blank" rel="noreferrer" className="break-all text-violet-300 hover:underline">{d.publicSiteUrl}</a>],
              [
                'Allowed origins',
                <span key="o" className="flex flex-wrap gap-1">
                  {d.publicOrigins.length ? d.publicOrigins.map((o) => <Mono key={o} className="rounded bg-white/5 px-1.5 py-0.5">{o}</Mono>) : <span className="text-dim">None</span>}
                </span>,
              ],
            ]}
          />
          <div className="space-y-2">
            <Guide title="Configure S3-compatible storage">
              Set these on the API server (e.g. in your hosting provider’s secret manager), then restart it. Works with AWS S3, Cloudflare R2, MinIO and similar.
              <EnvList
                vars={[
                  ['STORAGE_DRIVER=s3', 'switch from local disk'],
                  ['S3_BUCKET', 'bucket name'],
                  ['S3_REGION', 'e.g. eu-west-1 or auto'],
                  ['S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY', 'credentials with put/get/delete on the bucket'],
                  ['S3_ENDPOINT', 'optional, for non-AWS providers'],
                  ['S3_FORCE_PATH_STYLE', 'optional, true for MinIO'],
                  ['MEDIA_PUBLIC_BASE_URL', 'public URL files are served from (bucket or CDN)'],
                ]}
              />
            </Guide>
            <Guide title="Configure email (SMTP)">
              Needed for invitations, password resets and message notifications. Without it, invite links are shown once in the admin instead.
              <EnvList
                vars={[
                  ['SMTP_HOST / SMTP_PORT', 'your provider’s SMTP server'],
                  ['SMTP_USER / SMTP_PASSWORD', 'SMTP credentials'],
                  ['SMTP_FROM', 'sender, e.g. Portfolio <no-reply@example.com>'],
                  ['NOTIFY_EMAIL', 'where new-message notifications go'],
                ]}
              />
            </Guide>
          </div>
        </div>
      )}
    </Card>
  )
}
