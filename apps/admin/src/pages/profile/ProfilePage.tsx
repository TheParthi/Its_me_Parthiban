import { useState } from 'react'
import { profileSchema, type Profile } from '@pg/shared'
import { PreviewFrame } from '../../components/preview/PreviewFrame'
import { DocPublishControls, HistoryButton } from '../../components/profile/DocPublishControls'
import { useDocEditor } from '../../components/profile/useDocEditor'
import { Callout, ErrorState, PageHeader, PageSkeleton } from '../../components/ui'
import { AboutSection, ExploringSection } from './AboutSections'
import { AvailabilitySection, ContactSection } from './ContactSections'
import { BiosSection, HeroSection, IdentitySection } from './IdentitySections'
import { MediaSection } from './MediaSection'
import { EMPTY_PROFILE, type SectionProps } from './shared'

export default function ProfilePage() {
  const editor = useDocEditor<Profile>('profile', profileSchema, EMPTY_PROFILE, {
    write: ['content:write'],
    publish: ['content:publish'],
  })
  const [history, setHistory] = useState(false)
  const { doc, form } = editor

  const header = (
    <PageHeader
      eyebrow="Content"
      title="Profile"
      description="Your identity, bios, links and availability. Save a draft to preview it, then publish to update the public site."
      actions={<HistoryButton onClick={() => setHistory(true)} />}
    />
  )

  if (doc.error) {
    return (
      <>
        {header}
        <ErrorState error={doc.error} onRetry={() => doc.refetch()} title="Could not load the profile" />
      </>
    )
  }
  if (doc.isLoading || !form.value) {
    return (
      <>
        {header}
        <PageSkeleton />
      </>
    )
  }

  const props: SectionProps = {
    p: form.value,
    set: form.set,
    err: (path) => form.errors[path],
    disabled: !editor.canSave,
  }

  return (
    <>
      {header}
      {!editor.canSave && (
        <Callout tone="info" className="mb-4" title="Read-only">
          Your role can view the profile but not edit it.
        </Callout>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 space-y-5">
          {editor.formError && (
            <Callout tone="danger" title="The profile could not be saved">
              {editor.formError}
            </Callout>
          )}
          <IdentitySection {...props} />
          <MediaSection {...props} />
          <HeroSection {...props} />
          <BiosSection {...props} />
          <AboutSection {...props} />
          <ExploringSection {...props} />
          <ContactSection {...props} />
          <AvailabilitySection {...props} />
        </div>
        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start" aria-label="Live preview">
          <PreviewFrame version={doc.data?.updatedAt} height="h-[60vh] xl:h-[calc(100vh-11rem)]" />
          <p className="mt-2 text-xs text-muted">The preview shows the saved draft and refreshes after each save.</p>
        </aside>
      </div>
      <DocPublishControls editor={editor} entityType="profile" entityId="PROFILE" label="Profile" historyOpen={history} onHistoryClose={() => setHistory(false)} />
    </>
  )
}
