import { useRef, useState } from 'react'
import { DatabaseBackup, Download, FileJson, Upload, X } from 'lucide-react'
import { downloadBlob, fmtBytes, fmtDateTime } from '../../lib/format'
import { ApiError } from '../../lib/api'
import { Button, Callout, Card, CardHeader, ConfirmDialog, useToast } from '../../components/ui'
import { Gate, usePerm } from '../../components/admin/shared'
import { useBackupExport, useBackupRestore } from './settingsApi'

const SECTIONS: [string, string][] = [
  ['documents', 'Site documents'],
  ['projects', 'Projects'],
  ['skillCategories', 'Skill categories'],
  ['skills', 'Skills'],
  ['experience', 'Experience'],
  ['education', 'Education'],
  ['certifications', 'Certifications'],
  ['achievements', 'Achievements'],
  ['media', 'Media records'],
]

interface Parsed {
  name: string
  size: number
  body: Record<string, unknown>
  exportedAt: string | null
  counts: [string, number][]
  warning: string | null
}

function summarize(name: string, size: number, text: string): Parsed {
  const body = JSON.parse(text) as unknown
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('The file is not a backup object')
  const b = body as Record<string, unknown>
  const counts = SECTIONS.map(([k, label]) => [label, Array.isArray(b[k]) ? (b[k] as unknown[]).length : 0] as [string, number])
  const warning = b.format !== 'pg-portfolio-backup' ? 'This doesn’t look like a backup exported from this admin — the server will likely reject it.' : b.version !== 1 ? `Unsupported backup version ${String(b.version)}.` : null
  return { name, size, body: b, exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : null, counts, warning }
}

export function BackupPanel() {
  const exp = useBackupExport()
  const restore = useBackupRestore()
  const toast = useToast()
  const canExport = usePerm('backup:export')
  const canRestore = usePerm('backup:restore')
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  const onExport = () =>
    exp.mutate(undefined, {
      onSuccess: (blob) => {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        downloadBlob(blob, `portfolio-backup-${stamp}.json`)
        toast.success('Backup downloaded', 'Store it somewhere safe — it contains all your content, drafts included.')
      },
      onError: (e) => toast.fromError(e, 'Export failed'),
    })

  const onFile = async (f: File | undefined) => {
    setParsed(null)
    setParseError(null)
    if (!f) return
    if (f.size > 50 * 1024 * 1024) return setParseError('This file is larger than 50 MB and can’t be a valid backup.')
    try {
      setParsed(summarize(f.name, f.size, await f.text()))
    } catch (e) {
      setParseError(e instanceof SyntaxError ? 'This file isn’t valid JSON.' : (e as Error).message)
    }
  }

  const clear = () => {
    setParsed(null)
    setParseError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-muted" /> Backup & restore
          </span>
        }
        description="Export all portfolio content as JSON, or restore from a previous export. Media files themselves are not included — only their records."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3" aria-labelledby="bk-export">
          <h4 id="bk-export" className="text-sm font-medium text-fg">Export</h4>
          <p className="text-[13px] text-muted">Downloads content, drafts and publish state. Users, sessions, messages, analytics and settings are not included.</p>
          <Gate reason={canExport.reason}>
            <Button icon={<Download className="h-4 w-4" />} onClick={onExport} loading={exp.isPending} disabled={!canExport.allowed}>
              Download backup
            </Button>
          </Gate>
        </section>

        <section className="space-y-3" aria-labelledby="bk-restore">
          <h4 id="bk-restore" className="text-sm font-medium text-fg">Restore</h4>
          <Callout tone="danger" title="Restoring replaces ALL content">
            Every project, skill, collection entry and site document is replaced by the backup. Anything created since that export is lost. Download a fresh backup first.
          </Callout>
          <Gate reason={canRestore.reason}>
            <label className={`inline-flex ${canRestore.allowed ? '' : 'pointer-events-none opacity-50'}`}>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" disabled={!canRestore.allowed} onChange={(e) => onFile(e.target.files?.[0])} />
              <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line-2 bg-white/[0.04] px-4 text-sm font-medium text-fg hover:bg-white/[0.07] focus-within:outline-2 focus-within:outline-accent-2">
                <Upload className="h-4 w-4" /> Choose backup file…
              </span>
            </label>
          </Gate>
          {parseError && <Callout tone="danger">{parseError}</Callout>}
          {parsed && (
            <div className="rounded-lg border border-line bg-white/[0.02] p-3">
              <div className="flex items-start gap-2">
                <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg">{parsed.name}</p>
                  <p className="text-xs text-muted">
                    {fmtBytes(parsed.size)} · exported {fmtDateTime(parsed.exportedAt)}
                  </p>
                </div>
                <Button size="icon-sm" variant="ghost" onClick={clear} aria-label="Clear selected file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                {parsed.counts.map(([label, n]) => (
                  <div key={label} className="flex justify-between gap-2 border-b border-line/60 py-1">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-mono text-fg">{n}</dd>
                  </div>
                ))}
              </dl>
              {parsed.warning && <Callout tone="warning" className="mt-3">{parsed.warning}</Callout>}
              <Button variant="danger" className="mt-3" onClick={() => setConfirm(true)} disabled={!canRestore.allowed}>
                Restore this backup…
              </Button>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Replace all content?"
        description="All current content will be deleted and replaced by this backup in one transaction. This cannot be undone."
        typeToConfirm="RESTORE"
        confirmLabel="Restore backup"
        onConfirm={async () => {
          if (!parsed) return
          await restore.mutateAsync(parsed.body).then(
            (r) => {
              const total = Object.values(r.counts ?? {}).reduce((a, b) => a + b, 0)
              toast.success('Backup restored', `${total} records restored.`)
              setConfirm(false)
              clear()
            },
            (e) => {
              const issue = e instanceof ApiError && e.issues[0] ? ` (${e.issues[0].path}: ${e.issues[0].message})` : ''
              toast.error('Restore failed — nothing was changed', `${e instanceof Error ? e.message : 'Unknown error'}${issue}`)
            },
          )
        }}
      />
    </Card>
  )
}
