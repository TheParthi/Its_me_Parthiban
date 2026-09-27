import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, Plus, Wand2 } from 'lucide-react'
import { projectInputSchema } from '@pg/shared'
import { Button, Callout, Card, Input, PageHeader, Textarea, buttonClass, useToast } from '../../components/ui'
import { ApiError, errorMessage } from '../../lib/api'
import { serverErrors, zodErrors, type FieldErrors } from '../../lib/forms'
import { slugify } from '../../lib/format'
import { useProjectActions } from './projectApi'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { create } = useProjectActions()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [category, setCategory] = useState('')
  const [shortDescription, setShort] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const effectiveSlug = slugTouched ? slug : slugify(title)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    // Minimal fields + schema defaults for everything else.
    const input = { title, slug: effectiveSlug, category, shortDescription, description: '' }
    const errs = zodErrors(projectInputSchema, input)
    if (errs) return setErrors(errs)
    setErrors({})
    try {
      const p = await create.mutateAsync(projectInputSchema.parse(input))
      toast.success('Project created', 'Fill in the details, then publish when ready.')
      navigate(`/projects/${p.id}`, { replace: true })
    } catch (err) {
      const fe = serverErrors(err)
      if (fe) setErrors(fe)
      else if (err instanceof ApiError && err.status === 409) setErrors({ slug: err.message })
      else setFormError(errorMessage(err, 'Could not create the project'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/projects" className={buttonClass('ghost', 'sm', 'mb-3 -ml-2')}>
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>
      <PageHeader eyebrow="Content" title="New project" description="Start with the essentials. Everything else — media, stack, details, SEO — lives in the editor." />
      <Card>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {formError && <Callout tone="danger">{formError}</Callout>}
          <Input
            label="Title"
            required
            autoFocus
            maxLength={80}
            showCount
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g. NexaRide"
          />
          <Input
            label="Slug"
            required
            maxLength={80}
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value.toLowerCase())
            }}
            error={errors.slug}
            hint={slugTouched ? 'Used in links. Lowercase letters, numbers and dashes.' : 'Generated from the title — edit to customise.'}
            leading={<span className="font-mono text-xs">/</span>}
            className="font-mono"
            labelAction={
              slugTouched && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                  onClick={() => {
                    setSlugTouched(false)
                    setSlug('')
                  }}
                >
                  <Wand2 className="h-3 w-3" /> From title
                </button>
              )
            }
          />
          <Input
            label="Category"
            maxLength={120}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            error={errors.category}
            placeholder="e.g. Ride-Hailing Platform · Full-Stack Development"
          />
          <Textarea
            label="Short description"
            maxLength={400}
            rows={3}
            value={shortDescription}
            onChange={(e) => setShort(e.target.value)}
            error={errors.shortDescription}
            hint="One or two sentences for cards and previews."
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Link to="/projects" className={buttonClass('ghost', 'md')}>
              Cancel
            </Link>
            <Button type="submit" variant="primary" loading={create.isPending} icon={<Plus className="h-4 w-4" />}>
              Create project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
