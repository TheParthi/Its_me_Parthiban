import { z } from 'zod'
import { ROLES } from './permissions'

/** At least 12 chars with a mix; long passphrases are welcome. */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), 'Mix upper- and lower-case letters and a number')

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.boolean().default(false),
})

export const twoFactorVerifySchema = z.object({
  challengeId: z.string().min(10).max(200),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) })
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema })
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
export const reauthSchema = z.object({ password: z.string().min(1).max(200) })
export const totpEnableSchema = z.object({ code: z.string().regex(/^\d{6}$/) })

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(80),
  role: z.enum(ROLES),
})
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(ROLES).optional(),
  disabled: z.boolean().optional(),
})
export const acceptInviteSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema })

export interface AuthUser {
  id: string
  email: string
  name: string
  role: (typeof ROLES)[number]
  permissions: string[]
  twoFactorEnabled: boolean
  mustEnable2fa: boolean
}

export type LoginResponse =
  | { status: 'ok'; accessToken: string; expiresIn: number; user: AuthUser }
  | { status: '2fa_required'; challengeId: string }
