import {
  achievementInputSchema,
  certificationInputSchema,
  educationInputSchema,
  type AchievementInput,
  type CertificationInput,
  type EducationInput,
} from '@pg/shared'
import type { UseQueryResult } from '@tanstack/react-query'
import { Award, BadgeCheck, ExternalLink, GraduationCap } from 'lucide-react'
import { EntryManager, fmtMonth } from '../../components/entries'
import { MediaThumb } from '../../components/media/MediaPicker'
import { Badge } from '../../components/ui'
import { qk } from '../../lib/queries'
import type { CollectionAdmin } from '../../lib/types'
import { AchievementFields, KIND_TONE, blankAchievement } from './AchievementFields'
import { CertificationFields, blankCertification } from './CertificationFields'
import { EducationFields, blankEducation } from './EducationFields'

type Edu = CollectionAdmin<'education'>
type Cert = CollectionAdmin<'certifications'>
type Ach = CollectionAdmin<'achievements'>

const thumb = (id: string | null | undefined, Icon: typeof Award) => (
  <div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-white/[0.03] sm:block">
    {id ? <MediaThumb id={id} className="h-full w-full" /> : <div className="grid h-full w-full place-items-center text-dim"><Icon className="h-4 w-4" aria-hidden /></div>}
  </div>
)

export function EducationTab({ live }: { live: UseQueryResult<Edu[]> }) {
  return (
    <EntryManager<Edu, EducationInput>
      src={{ base: '/admin/education', key: qk.collection('education') }}
      live={live}
      noun="education entry"
      plural="entries"
      icon={<GraduationCap className="h-5 w-5" />}
      schema={educationInputSchema}
      blank={blankEducation}
      heading={(d) => d.institution}
      emptyDescription="Add your degree or school."
      renderLeading={() => thumb(null, GraduationCap)}
      renderRow={(x) => (
        <>
          <p className="truncate text-sm font-medium text-fg">{x.institution}</p>
          <p className="mt-0.5 text-xs text-muted">
            {[x.degree, x.field].filter(Boolean).join(', ')}
            {(x.startYear || x.graduationYear) && <span className="text-dim"> · {[x.startYear, x.graduationYear].filter(Boolean).join(' — ')}</span>}
            {x.grade && <span className="text-dim"> · {x.grade}</span>}
          </p>
        </>
      )}
      renderFields={(f) => <EducationFields {...f} />}
    />
  )
}

export function CertificationsTab({ live }: { live: UseQueryResult<Cert[]> }) {
  return (
    <EntryManager<Cert, CertificationInput>
      src={{ base: '/admin/certifications', key: qk.collection('certifications') }}
      live={live}
      noun="certification"
      plural="certifications"
      icon={<BadgeCheck className="h-5 w-5" />}
      schema={certificationInputSchema}
      blank={blankCertification}
      heading={(d) => d.name}
      emptyDescription="Add certifications with a credential link so visitors can verify them."
      renderLeading={(x) => thumb(x.imageId, BadgeCheck)}
      renderRow={(x) => (
        <>
          <p className="truncate text-sm font-medium text-fg">{x.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{x.issuer}</span>
            {x.issueDate && <span className="text-dim">· Issued {fmtMonth(x.issueDate)}</span>}
            {x.expirationDate && <span className="text-dim">· Expires {fmtMonth(x.expirationDate)}</span>}
            {x.credentialUrl && (
              <span className="inline-flex items-center gap-1 text-dim">
                <ExternalLink className="h-3 w-3" aria-hidden /> credential
              </span>
            )}
          </p>
        </>
      )}
      renderFields={(f) => <CertificationFields {...f} />}
    />
  )
}

export function AchievementsTab({ live }: { live: UseQueryResult<Ach[]> }) {
  return (
    <EntryManager<Ach, AchievementInput>
      src={{ base: '/admin/achievements', key: qk.collection('achievements') }}
      live={live}
      noun="achievement"
      plural="achievements"
      icon={<Award className="h-5 w-5" />}
      schema={achievementInputSchema}
      blank={blankAchievement}
      heading={(d) => d.title}
      emptyDescription="Hackathons, selections, papers and awards."
      renderLeading={(x) => thumb(x.mediaId, Award)}
      renderRow={(x) => (
        <>
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">{x.title}</span>
            <Badge tone={KIND_TONE[x.kind] ?? 'gray'}>{x.kind}</Badge>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {x.event || '—'}
            {x.date && <span className="text-dim"> · {fmtMonth(x.date)}</span>}
          </p>
        </>
      )}
      renderFields={(f) => <AchievementFields {...f} />}
    />
  )
}
