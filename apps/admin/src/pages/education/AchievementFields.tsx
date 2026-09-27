import { ACHIEVEMENT_KINDS, type AchievementInput } from '@pg/shared'
import { MediaField, fromMonthInput, toMonthInput, type EntryForm } from '../../components/entries'
import type { BadgeTone } from '../../components/ui'
import { Input, Select, Switch, Textarea } from '../../components/ui'

type Kind = (typeof ACHIEVEMENT_KINDS)[number]

export const KIND_HELP: Record<Kind, string> = {
  Winner: 'Won the event.',
  Selected: 'Advanced or was selected (e.g. Round 2) — not a win.',
  Participated: 'Took part.',
  Research: 'Papers and publications.',
  Award: 'An award or honour.',
  Other: 'Anything else.',
}

export const KIND_TONE: Record<Kind, BadgeTone> = {
  Winner: 'emerald',
  Selected: 'cyan',
  Participated: 'neutral',
  Research: 'violet',
  Award: 'amber',
  Other: 'gray',
}

export const blankAchievement: AchievementInput = {
  title: '',
  kind: 'Participated',
  event: '',
  date: null,
  description: '',
  mediaId: null,
  verificationUrl: '',
  visible: true,
}

export function AchievementFields({ value: v, set, errors: e, readOnly }: EntryForm<AchievementInput>) {
  return (
    <>
      <Input label="Title" required maxLength={120} value={v.title} onChange={(x) => set('title', x.target.value)} error={e.title} data-autofocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select<Kind>
          label="Result"
          value={v.kind}
          options={ACHIEVEMENT_KINDS.map((k) => ({ value: k, label: k }))}
          onChange={(k) => set('kind', k)}
          hint={KIND_HELP[v.kind]}
          error={e.kind}
        />
        <Input label="Date" type="month" value={toMonthInput(v.date)} onChange={(x) => set('date', fromMonthInput(x.target.value))} error={e.date} />
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-xs sm:grid-cols-2">
        {ACHIEVEMENT_KINDS.map((k) => (
          <div key={k} className="flex gap-1.5">
            <dt className="font-medium text-fg">{k}</dt>
            <dd className="text-muted">— {KIND_HELP[k]}</dd>
          </div>
        ))}
      </dl>
      <Input label="Event or organiser" maxLength={120} value={v.event ?? ''} onChange={(x) => set('event', x.target.value)} error={e.event} />
      <Textarea label="Description" rows={3} maxLength={600} showCount value={v.description ?? ''} onChange={(x) => set('description', x.target.value)} error={e.description} />
      <MediaField label="Photo or certificate" value={v.mediaId} onChange={(id) => set('mediaId', id)} error={e.mediaId} disabled={readOnly} />
      <Input
        label="Verification URL"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={v.verificationUrl ?? ''}
        onChange={(x) => set('verificationUrl', x.target.value)}
        error={e.verificationUrl}
        hint="Results page, certificate or post that confirms it."
      />
      <Switch label="Visible on the site" description="Hidden entries stay in the admin but are never shown publicly." checked={v.visible ?? true} onChange={(c) => set('visible', c)} />
    </>
  )
}
