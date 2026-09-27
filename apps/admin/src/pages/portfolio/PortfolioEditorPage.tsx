import { useState, type ReactNode } from 'react'
import { Award, Briefcase, FolderKanban, GraduationCap, LayoutTemplate, Medal, Palette, Search, Send, Sparkles, UserRound } from 'lucide-react'
import { Button, Callout, PageHeader, SectionTitle } from '../../components/ui'
import { useCan } from '../../lib/auth'
import { DocAreaCard, ListAreaCard } from './AreaCard'
import { PublishAllDialog } from './PublishAllDialog'
import { pendingItems, usePortfolioData } from './usePortfolioData'

const ICONS: Record<string, ReactNode> = {
  profile: <UserRound className="h-4 w-4" />,
  homepage: <LayoutTemplate className="h-4 w-4" />,
  appearance: <Palette className="h-4 w-4" />,
  seo: <Search className="h-4 w-4" />,
  projects: <FolderKanban className="h-4 w-4" />,
  skills: <Sparkles className="h-4 w-4" />,
  experience: <Briefcase className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  certifications: <Award className="h-4 w-4" />,
  achievements: <Medal className="h-4 w-4" />,
}

export default function PortfolioEditorPage() {
  const data = usePortfolioData()
  const can = useCan()
  const [open, setOpen] = useState(false)
  const loading = [...data.docs, ...data.lists].some((a) => a.query.isLoading)
  const failed = [...data.docs, ...data.lists].filter((a) => a.query.error).length
  const pending = pendingItems(data)
  const edits = pending.filter((p) => !p.firstPublish).length
  const canPublish = can('content:publish')

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Portfolio Editor"
        description="Every part of the public site at a glance: what is live, what has unpublished edits, and where to change it."
        actions={
          <Button
            variant="primary"
            icon={<Send className="h-4 w-4" />}
            onClick={() => setOpen(true)}
            disabled={!canPublish || loading || pending.length === 0}
            loading={loading}
            title={!canPublish ? 'You need the content:publish permission' : pending.length === 0 ? 'Nothing is waiting to be published' : undefined}
          >
            Publish everything pending{pending.length ? ` (${pending.length})` : ''}
          </Button>
        }
      />

      {!loading && pending.length > 0 && (
        <Callout tone="warning" className="mb-6" title={`${pending.length} item${pending.length === 1 ? '' : 's'} waiting to be published`}>
          {edits} with edits to live content, {pending.length - edits} draft{pending.length - edits === 1 ? '' : 's'} never published.
          {!can('site:write') && ' Homepage, Appearance and SEO also need the site:write permission.'}
        </Callout>
      )}
      {failed > 0 && (
        <Callout tone="danger" className="mb-6" title="Some areas could not be loaded">
          Their status is unknown and they are left out of “Publish everything pending”.
        </Callout>
      )}

      <section aria-labelledby="site-docs" className="mb-8">
        <SectionTitle description="Singleton documents — one draft and one published copy each.">
          <span id="site-docs">Pages & site settings</span>
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {data.docs.map((a) => (
            <DocAreaCard key={a.key} area={a} icon={ICONS[a.key]} />
          ))}
        </div>
      </section>

      <section aria-labelledby="collections">
        <SectionTitle description="Lists of entries, each drafted and published on its own.">
          <span id="collections">Content collections</span>
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.lists.map((a) => (
            <ListAreaCard key={a.key} area={a} icon={ICONS[a.key]} />
          ))}
        </div>
      </section>

      <PublishAllDialog open={open} onClose={() => setOpen(false)} items={pending} />
    </>
  )
}
