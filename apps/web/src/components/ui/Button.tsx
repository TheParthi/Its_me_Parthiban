import { ArrowUpRight } from 'lucide-react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Magnetic } from './Magnetic'

type Variant = 'primary' | 'ghost'

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  icon?: ReactNode
  children: ReactNode
}

const base =
  'group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-6 py-3.5 text-sm font-medium transition-colors duration-300'
const variants: Record<Variant, string> = {
  primary: 'bg-fg text-ink hover:bg-white',
  ghost: 'border border-line-2 text-fg hover:border-fg/60',
}

/** Magnetic pill link with an arrow that slides out and back in on hover. */
export function Button({ variant = 'primary', icon, children, className = '', ...rest }: Props) {
  return (
    <Magnetic>
      <a className={`${base} ${variants[variant]} ${className}`} data-cursor="link" {...rest}>
        <span>{children}</span>
        <span className="relative grid h-5 w-5 place-items-center overflow-hidden">
          {icon ?? (
            <>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-5 group-hover:translate-x-5" />
              <ArrowUpRight className="absolute h-4 w-4 -translate-x-5 translate-y-5 transition-transform duration-500 ease-out-expo group-hover:translate-x-0 group-hover:translate-y-0" />
            </>
          )}
        </span>
      </a>
    </Magnetic>
  )
}
