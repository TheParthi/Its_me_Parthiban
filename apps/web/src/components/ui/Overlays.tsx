import { AnimatePresence, motion } from 'framer-motion'
import { useContent } from '../../content/context'
import { setConsent, useConsentPrompt } from '../../lib/analytics'
import { EASE } from '../../lib/motion'

/** Small fixed badge shown on ?preview= links. */
export function PreviewBadge() {
  const { preview } = useContent()
  if (preview === 'off') return null
  const label =
    preview === 'loading' ? 'Loading preview…' : preview === 'active' ? 'Preview — unpublished changes' : 'Preview expired — showing published site'
  const dot = preview === 'active' ? 'bg-amber-300' : preview === 'expired' ? 'bg-rose-400' : 'bg-mute'
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[75] inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-line-2 bg-ink-2/90 px-3.5 py-2 font-mono text-[11px] text-fg/90 shadow-lg backdrop-blur"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{label}</span>
    </div>
  )
}

/** Opt-in for a persistent anonymous visitor id; shown only when the CMS requires consent. */
export function ConsentBar() {
  const show = useConsentPrompt()
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="region"
          aria-label="Analytics consent"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 1.2 }}
          className="fixed inset-x-4 bottom-4 z-[74] mx-auto flex max-w-md flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line-2 bg-ink-2/95 px-4 py-3 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:mx-0"
        >
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg/90">
            Allow anonymous analytics?
            <span className="mt-0.5 block text-[11px] text-mute">Stores a random ID in this browser to count return visits. No personal data.</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConsent('denied')}
              className="btn-shape rounded-full border border-line-2 px-3.5 py-1.5 text-[12px] text-mute transition-colors hover:text-fg"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={() => setConsent('granted')}
              className="btn-shape rounded-full bg-fg px-3.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-white"
            >
              Allow
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
