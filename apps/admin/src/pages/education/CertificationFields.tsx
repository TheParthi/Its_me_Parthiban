import type { CertificationInput } from '@pg/shared'
import { MediaField, fromMonthInput, toMonthInput, type EntryForm } from '../../components/entries'
import { Input, Switch, Textarea } from '../../components/ui'

export const blankCertification: CertificationInput = {
  name: '',
  issuer: '',
  issueDate: null,
  expirationDate: null,
  credentialUrl: '',
  imageId: null,
  description: '',
  visible: true,
}

export function CertificationFields({ value: v, set, errors: e, readOnly }: EntryForm<CertificationInput>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required maxLength={120} value={v.name} onChange={(x) => set('name', x.target.value)} error={e.name} data-autofocus />
        <Input label="Issuer" required maxLength={120} placeholder="e.g. Microsoft" value={v.issuer} onChange={(x) => set('issuer', x.target.value)} error={e.issuer} />
        <Input label="Issued" type="month" value={toMonthInput(v.issueDate)} onChange={(x) => set('issueDate', fromMonthInput(x.target.value))} error={e.issueDate} />
        <Input
          label="Expires"
          type="month"
          hint="Leave empty if it does not expire."
          value={toMonthInput(v.expirationDate)}
          onChange={(x) => set('expirationDate', fromMonthInput(x.target.value))}
          error={e.expirationDate}
        />
      </div>
      <Input
        label="Credential URL"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={v.credentialUrl ?? ''}
        onChange={(x) => set('credentialUrl', x.target.value)}
        error={e.credentialUrl}
        hint="Public verification link (http or https)."
      />
      <MediaField label="Badge or certificate image" value={v.imageId} onChange={(id) => set('imageId', id)} error={e.imageId} disabled={readOnly} />
      <Textarea label="Description" rows={3} maxLength={300} showCount value={v.description ?? ''} onChange={(x) => set('description', x.target.value)} error={e.description} />
      <Switch label="Visible on the site" description="Hidden entries stay in the admin but are never shown publicly." checked={v.visible ?? true} onChange={(c) => set('visible', c)} />
    </>
  )
}
