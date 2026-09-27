import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Bold, Code, Heading, Italic, Link, List, ListOrdered, Quote } from 'lucide-react'
import { cn } from '../../lib/format'
import { Segmented, controlClass } from '../ui'

/** Markdown → sanitised HTML (same pipeline the preview uses). */
export function renderMarkdown(md: string) {
  const html = marked.parse(md ?? '', { async: false, gfm: true, breaks: false }) as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'iframe', 'form'], FORBID_ATTR: ['style'] })
}

type Action = { icon: ReactNode; label: string; apply: (sel: string) => { text: string; cursorOffset?: number }; line?: boolean }

const ACTIONS: Action[] = [
  { icon: <Bold className="h-3.5 w-3.5" />, label: 'Bold', apply: (s) => ({ text: `**${s || 'bold'}**` }) },
  { icon: <Italic className="h-3.5 w-3.5" />, label: 'Italic', apply: (s) => ({ text: `_${s || 'italic'}_` }) },
  { icon: <Heading className="h-3.5 w-3.5" />, label: 'Heading', apply: (s) => ({ text: `## ${s || 'Heading'}` }), line: true },
  { icon: <Link className="h-3.5 w-3.5" />, label: 'Link', apply: (s) => ({ text: `[${s || 'link text'}](https://)` }) },
  { icon: <List className="h-3.5 w-3.5" />, label: 'Bulleted list', apply: (s) => ({ text: (s || 'item').split('\n').map((l) => `- ${l}`).join('\n') }), line: true },
  { icon: <ListOrdered className="h-3.5 w-3.5" />, label: 'Numbered list', apply: (s) => ({ text: (s || 'item').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') }), line: true },
  { icon: <Quote className="h-3.5 w-3.5" />, label: 'Quote', apply: (s) => ({ text: `> ${s || 'quote'}` }), line: true },
  { icon: <Code className="h-3.5 w-3.5" />, label: 'Code', apply: (s) => ({ text: s.includes('\n') ? `\`\`\`\n${s}\n\`\`\`` : `\`${s || 'code'}\`` }) },
]

export interface MarkdownEditorProps {
  label?: ReactNode
  hint?: ReactNode
  value: string
  onChange: (v: string) => void
  maxLength?: number
  error?: string | null
  rows?: number
}

/** Textarea + formatting toolbar + live sanitised preview. */
export function MarkdownEditor({ label, hint, value, onChange, maxLength, error, rows = 14 }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  const [mode, setMode] = useState<'split' | 'write' | 'preview'>('split')
  const html = useMemo(() => renderMarkdown(value), [value])

  const apply = (a: Action) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const sel = value.slice(s, e)
    const { text } = a.apply(sel)
    const before = value.slice(0, s)
    const prefix = a.line && before && !before.endsWith('\n') ? '\n' : ''
    const next = before + prefix + text + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = s + prefix.length + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        {label && (
          <label htmlFor={id} className="text-[13px] font-medium text-[#d5d9e1]">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2">
          {maxLength && <span className={cn('font-mono text-[11px]', value.length > maxLength ? 'text-rose-400' : 'text-dim')}>{value.length}/{maxLength}</span>}
          <Segmented
            size="sm"
            aria-label="Editor layout"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'write', label: 'Write' },
              { value: 'split', label: 'Split' },
              { value: 'preview', label: 'Preview' },
            ]}
          />
        </div>
      </div>
      <div className={cn('overflow-hidden rounded-lg border', error ? 'border-rose-500/50' : 'border-line')}>
        {mode !== 'preview' && (
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-line bg-white/[0.02] px-1.5 py-1">
            {ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => apply(a)}
                title={a.label}
                aria-label={a.label}
                className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-white/[0.06] hover:text-fg"
              >
                {a.icon}
              </button>
            ))}
          </div>
        )}
        <div className={cn('grid', mode === 'split' && 'lg:grid-cols-2')}>
          {mode !== 'preview' && (
            <textarea
              id={id}
              ref={ref}
              value={value}
              rows={rows}
              onChange={(e) => onChange(e.target.value)}
              aria-invalid={!!error || undefined}
              className={cn(controlClass, 'rounded-none border-0 py-3 font-mono text-[13px] leading-relaxed focus:ring-0')}
              placeholder="Write in Markdown…"
            />
          )}
          {mode !== 'write' && (
            <div
              className={cn('prose-admin scroll-thin max-h-[32rem] min-h-40 overflow-auto bg-black/20 px-4 py-3 text-sm', mode === 'split' && 'border-t border-line lg:border-l lg:border-t-0')}
              aria-label="Markdown preview"
              // Sanitised with DOMPurify above.
              dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:.5">Nothing to preview</p>' }}
            />
          )}
        </div>
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}
    </div>
  )
}
