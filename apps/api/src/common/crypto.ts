import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto'
import { env } from '../config/env'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** URL-safe random token with 256 bits of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plain: string) {
  const key = Buffer.from(env().ENCRYPTION_KEY, 'base64')
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64url')).join('.')
}

export function decrypt(payload: string) {
  const [iv, tag, ct] = payload.split('.').map((p) => Buffer.from(p, 'base64url'))
  const key = Buffer.from(env().ENCRYPTION_KEY, 'base64')
  const d = createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}
