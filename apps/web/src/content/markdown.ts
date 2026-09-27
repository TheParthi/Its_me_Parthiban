import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Loaded lazily with the project modal, so marked + DOMPurify stay out of the
// first-paint bundle.

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/** Markdown → sanitised HTML. Raw HTML in the source is dropped. */
export function renderMarkdown(src: string): string {
  const html = marked.parse(src ?? '', { async: false, gfm: true, breaks: false }) as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'button', 'script', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/|\.\/)/i,
  })
}
