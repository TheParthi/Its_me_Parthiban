import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Copy, FileDown, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { profile } from '../../data/profile'
import { EASE } from '../../lib/motion'
import { GitHubIcon, LinkedInIcon } from '../ui/Icons'
import { Magnetic } from '../ui/Magnetic'
import { SectionLabel, SplitHeading } from '../ui/Reveal'

type Field = 'name' | 'email' | 'subject' | 'message'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Record<Field, string>) {
  const e: Partial<Record<Field, string>> = {}
  if (v.name.trim().length < 2) e.name = 'Please enter your name.'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Please enter a valid email address.'
  if (v.subject.trim().length < 3) e.subject = 'Add a short subject.'
  if (v.message.trim().length < 10) e.message = 'Tell me a little more (at least 10 characters).'
  return e
}

function Input({
  id,
  label,
  error,
  textarea,
  ...rest
}: {
  id: Field
  label: string
  error?: string
  textarea?: boolean
} & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const cls = `peer w-full rounded-none border-0 border-b bg-transparent px-0 pb-3 pt-6 text-base text-fg outline-none transition-colors placeholder:text-transparent focus:border-cyan focus-visible:outline-none ${
    error ? 'border-rose-400/70' : 'border-line-2'
  }`
  return (
    <div className="relative">
      {textarea ? (
        <textarea id={id} name={id} rows={4} placeholder={label} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`${cls} resize-none`} {...rest} />
      ) : (
        <input id={id} name={id} placeholder={label} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={cls} {...rest} />
      )}
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-0 top-6 font-mono text-xs uppercase tracking-widest text-mute transition-all peer-focus:top-0 peer-focus:text-[10px] peer-focus:text-cyan peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px]"
      >
        {label}
      </label>
      {error && (
        <p id={`${id}-err`} className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}

export function Contact() {
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    // No backend: hand the message to the visitor's own email app.
    const body = `${values.message}\n\n— ${values.name} (${values.email})`
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`
    setOpened(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable — the address is visible anyway */
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 md:pt-44">
      <div aria-hidden className="absolute -bottom-40 left-1/2 -z-10 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-violet/15 blur-[160px]" />
      <div className="mx-auto max-w-7xl">
        <SectionLabel index="07">Contact</SectionLabel>
        <SplitHeading
          text="Have an interesting problem to solve?"
          className="mt-8 max-w-5xl font-display text-[clamp(2.8rem,7.5vw,7rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
        />

        <div className="mt-16 grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-lg leading-relaxed text-mute">
              I'm always interested in building meaningful products, exploring new technologies, and connecting with people who enjoy solving challenging problems.
            </p>

            <div className="mt-10">
              <Magnetic strength={0.25}>
                <a
                  href={`mailto:${profile.email}`}
                  className="group relative inline-flex items-center gap-5 overflow-hidden rounded-full bg-fg py-3 pl-7 pr-3 text-ink"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-violet to-cyan transition-transform duration-700 ease-out-expo group-hover:scale-x-100" />
                  <span className="relative text-sm font-medium transition-colors duration-500 group-hover:text-white sm:text-base">Say hello</span>
                  <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-ink text-fg">
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-500 ease-out-expo group-hover:-translate-y-6 group-hover:translate-x-6" />
                    <ArrowUpRight className="absolute h-5 w-5 -translate-x-6 translate-y-6 transition-transform duration-500 ease-out-expo group-hover:translate-x-0 group-hover:translate-y-0" />
                  </span>
                </a>
              </Magnetic>
            </div>

            <div className="mt-8 flex items-center gap-3 font-mono text-sm">
              <Mail className="h-4 w-4 text-mute" />
              <a href={`mailto:${profile.email}`} className="break-all text-fg/90 hover:text-cyan">
                {profile.email}
              </a>
              <button type="button" onClick={copy} aria-label="Copy email address" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line hover:border-line-2">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5 text-mute" />}
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? 'Email copied' : ''}
              </span>
            </div>

            <ul className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              {[
                { label: 'GitHub', href: profile.links.github, icon: <GitHubIcon className="h-5 w-5" /> },
                { label: 'LinkedIn', href: profile.links.linkedin, icon: <LinkedInIcon className="h-5 w-5" /> },
                { label: 'Resume', href: profile.resumeUrl, icon: <FileDown className="h-5 w-5" />, download: true },
              ].map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target={l.download ? undefined : '_blank'}
                    rel="noopener"
                    download={l.download || undefined}
                    className="group flex h-full flex-col justify-between gap-8 bg-ink p-4 transition-colors hover:bg-ink-2"
                  >
                    <span className="text-mute transition-colors group-hover:text-fg">{l.icon}</span>
                    <span className="flex items-center justify-between text-sm">
                      {l.label}
                      <ArrowUpRight className="h-3.5 w-3.5 text-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={submit} noValidate className="rounded-[28px] border border-line bg-ink-2/60 p-6 backdrop-blur sm:p-10 lg:col-span-6 lg:col-start-7" aria-describedby="form-note">
            <div className="grid gap-8 sm:grid-cols-2">
              <Input id="name" label="Name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
              <Input id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
            </div>
            <div className="mt-8">
              <Input id="subject" label="Subject" value={values.subject} onChange={set('subject')} error={errors.subject} />
            </div>
            <div className="mt-8">
              <Input id="message" label="Message" textarea value={values.message} onChange={set('message')} error={errors.message} />
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <p id="form-note" className="max-w-xs text-xs leading-relaxed text-dim">
                This site has no mail server. Sending opens your email app with the message ready — nothing is sent until you press send there.
              </p>
              <button type="submit" className="group inline-flex items-center gap-2 rounded-full bg-fg px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white">
                Open in email app
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </div>
            {opened && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }} className="mt-6 text-sm text-emerald-300" role="status">
                Your email app should now be open with the message. If nothing happened, write to {profile.email} directly.
              </motion.p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
