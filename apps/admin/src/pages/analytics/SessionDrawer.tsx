import type { ReactNode } from 'react'
import { Download, ExternalLink, Eye, FileText, FolderOpen, Code2, Briefcase, Mail, MousePointerClick, PenLine, Timer, Activity } from 'lucide-react'
import { Badge, Drawer, ErrorState, KeyValue, SkeletonRows } from '../../components/ui'
import { fmtDateTime, fmtDuration } from '../../lib/format'
import { useSession, type SessionEvent } from './api'
import { deviceLabel, shortId, sourceLabel } from './format'

const EVENT: Record<string, { label: string; icon: ReactNode }> = {
  PAGE_VIEW: { label: 'Page view', icon: <Eye className="h-3.5 w-3.5" /> },
  PROJECT_VIEW: { label: 'Project view', icon: <FolderOpen className="h-3.5 w-3.5" /> },
  PROJECT_CLICK: { label: 'Project link click', icon: <ExternalLink className="h-3.5 w-3.5" /> },
  RESUME_DOWNLOAD: { label: 'Résumé download', icon: <Download className="h-3.5 w-3.5" /> },
  GITHUB_CLICK: { label: 'GitHub click', icon: <Code2 className="h-3.5 w-3.5" /> },
  LINKEDIN_CLICK: { label: 'LinkedIn click', icon: <Briefcase className="h-3.5 w-3.5" /> },
  CONTACT_FORM_START: { label: 'Contact form started', icon: <PenLine className="h-3.5 w-3.5" /> },
  CONTACT_FORM_SUBMIT: { label: 'Contact form sent', icon: <Mail className="h-3.5 w-3.5" /> },
  SECTION_VIEW: { label: 'Section viewed', icon: <FileText className="h-3.5 w-3.5" /> },
  CTA_CLICK: { label: 'CTA click', icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  HEARTBEAT: { label: 'Heartbeat', icon: <Timer className="h-3.5 w-3.5" /> },
}

const timeFmt = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function EventRow({ e, start }: { e: SessionEvent; start: number }) {
  const meta = EVENT[e.type] ?? { label: e.type, icon: <Activity className="h-3.5 w-3.5" /> }
  const offset = Math.max(0, Math.round((new Date(e.createdAt).getTime() - start) / 1000))
  const details = [
    e.projectSlug && `project ${e.projectSlug}`,
    e.section && `section ${e.section}`,
    e.target && `target ${e.target}`,
    e.value != null && `${fmtDuration(e.value)} visible`,
  ].filter(Boolean)
  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-0.5 grid h-6 w-6 place-items-center rounded-full border border-line-2 bg-card text-muted">{meta.icon}</span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[13px] font-medium text-fg">{meta.label}</span>
        <span className="font-mono text-[11px] text-dim" title={fmtDateTime(e.createdAt)}>
          {timeFmt.format(new Date(e.createdAt))} · +{fmtDuration(offset)}
        </span>
      </div>
      <p className="font-mono text-xs text-muted">{e.path}</p>
      {details.length > 0 && <p className="text-xs text-dim">{details.join(' · ')}</p>}
    </li>
  )
}

export function SessionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useSession(id)
  const s = q.data
  return (
    <Drawer open={!!id} onClose={onClose} title={`Session ${shortId(id)}`} description="Anonymous visit — not a person. No IP address is stored.">
      {q.isPending ? (
        <SkeletonRows rows={8} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Could not load session" />
      ) : (
        s && (
          <div className="space-y-6">
            <KeyValue
              items={[
                ['Started', fmtDateTime(s.startedAt)],
                ['Last activity', fmtDateTime(s.lastSeenAt)],
                ['Anonymous visitor', s.visitor ? <span className="font-mono text-xs">{s.visitor}</span> : 'No consent (not recognisable)'],
                ['Visitor type', s.isNewVisitor ? <Badge tone="violet">new</Badge> : <Badge tone="cyan">returning</Badge>],
                ['Landing page', <span className="font-mono text-xs">{s.landingPath}</span>],
                ['Source', `${sourceLabel(s.source)}${s.referrerDomain ? ` · ${s.referrerDomain}` : ''}`],
                ...(s.utmCampaign || s.utmSource
                  ? ([['Campaign', [s.utmSource, s.utmMedium, s.utmCampaign].filter(Boolean).join(' / ')]] as [ReactNode, ReactNode][])
                  : []),
                ['Device', `${deviceLabel(s.device)} · ${s.browser} · ${s.os}`],
                ['Country', s.country ? `${s.country}${s.region ? ` · ${s.region}` : ''}` : '—'],
                ['Engaged time', fmtDuration(s.engagedSec)],
                ['Page views / events', `${s.pageViews} / ${s.eventCount}`],
              ]}
            />
            <div>
              <h3 className="mb-3 text-sm font-semibold text-fg">Event timeline</h3>
              {s.events.length ? (
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-px before:bg-line-2">
                  {s.events.map((e) => (
                    <EventRow key={e.id} e={e} start={new Date(s.startedAt).getTime()} />
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-muted">No events recorded for this session.</p>
              )}
            </div>
          </div>
        )
      )}
    </Drawer>
  )
}
