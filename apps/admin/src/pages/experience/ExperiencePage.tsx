import { experienceInputSchema, type ExperienceInput } from '@pg/shared'
import { Briefcase, MapPin } from 'lucide-react'
import { EntryManager, fmtRange } from '../../components/entries'
import { PageHeader } from '../../components/ui'
import { qk, useCollection } from '../../lib/queries'
import type { CollectionAdmin } from '../../lib/types'
import { ExperienceFields, blankExperience } from './ExperienceFields'

type Row = CollectionAdmin<'experience'>

export default function ExperiencePage() {
  const live = useCollection('experience')
  return (
    <div className="space-y-6">
      <PageHeader
        title="Experience"
        description="Roles shown on your timeline, in this order. Edits are saved as drafts until you publish them."
      />
      <EntryManager<Row, ExperienceInput>
        src={{ base: '/admin/experience', key: qk.collection('experience') }}
        live={live}
        noun="role"
        plural="roles"
        icon={<Briefcase className="h-5 w-5" />}
        schema={experienceInputSchema}
        blank={blankExperience}
        heading={(d) => [d.position, d.organization].filter(Boolean).join(' · ')}
        emptyDescription="Add internships, jobs and volunteer roles. They appear on the site once published."
        renderRow={(x) => (
          <>
            <p className="truncate text-sm font-medium text-fg">
              {x.position} <span className="text-muted">· {x.organization}</span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>{fmtRange(x.startDate, x.endDate, x.current) || 'No dates'}</span>
              <span className="text-dim">·</span>
              <span>{x.employmentType}</span>
              {x.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {x.location}
                </span>
              )}
            </p>
          </>
        )}
        renderFields={(f) => <ExperienceFields {...f} />}
      />
    </div>
  )
}
