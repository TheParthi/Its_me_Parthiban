import { useSearchParams } from 'react-router'
import { Award, BadgeCheck, GraduationCap } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/ui'
import { useCollection } from '../../lib/queries'
import { AchievementsTab, CertificationsTab, EducationTab } from './EducationTabs'

const TABS = ['education', 'certifications', 'achievements'] as const
type Tab = (typeof TABS)[number]

export default function EducationPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'education'
  // Counts for the tab labels (these queries are shared with the tabs below).
  const edu = useCollection('education')
  const certs = useCollection('certifications')
  const ach = useCollection('achievements')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Education"
        description="Degrees, certifications and achievements. Each item is a draft until you publish it."
      />
      <Tabs<Tab>
        aria-label="Education sections"
        value={tab}
        onChange={(t) => setParams(t === 'education' ? {} : { tab: t }, { replace: true })}
        items={[
          { value: 'education', label: 'Education', icon: <GraduationCap className="h-4 w-4" />, count: edu.data?.length },
          { value: 'certifications', label: 'Certifications', icon: <BadgeCheck className="h-4 w-4" />, count: certs.data?.length },
          { value: 'achievements', label: 'Achievements', icon: <Award className="h-4 w-4" />, count: ach.data?.length },
        ]}
      />
      <div role="tabpanel" aria-label={tab}>
        {tab === 'education' && <EducationTab live={edu} />}
        {tab === 'certifications' && <CertificationsTab live={certs} />}
        {tab === 'achievements' && <AchievementsTab live={ach} />}
      </div>
    </div>
  )
}
