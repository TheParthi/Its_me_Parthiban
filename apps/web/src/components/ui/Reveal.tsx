import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE } from '../../lib/motion'

interface RevealProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  y?: number
}

/** Fades and lifts its children into view once. */
export function Reveal({ children, delay = 0, y = 28, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Splits a heading into words that rise out of a mask, staggered. */
export function SplitHeading({
  text,
  className = '',
  as: Tag = 'h2',
  delay = 0,
}: {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  delay?: number
}) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '105%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '-5% 0px' }}
            transition={{ duration: 1, ease: EASE, delay: delay + i * 0.06 }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

export function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="eyebrow flex items-center gap-3">
      <span className="text-cyan">{index}</span>
      <span className="h-px w-10 bg-line-2" />
      <span>{children}</span>
    </div>
  )
}
