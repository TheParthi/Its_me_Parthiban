import { z } from 'zod'

/** Runtime-editable, non-secret settings. Secrets stay in server env vars. */
export const siteSettingsSchema = z.object({
  analytics: z.object({
    enabled: z.boolean(),
    /** Ask for consent before setting a persistent visitor id. */
    requireConsent: z.boolean(),
    respectDoNotTrack: z.boolean(),
    retentionDays: z.number().int().min(7).max(730),
    liveWindowMinutes: z.number().int().min(1).max(60),
  }),
  contact: z.object({
    enabled: z.boolean(),
    notifyByEmail: z.boolean(),
    retentionDays: z.number().int().min(30).max(3650),
  }),
  security: z.object({
    accessTokenMinutes: z.number().int().min(5).max(60),
    sessionDays: z.number().int().min(1).max(90),
    maxFailedLogins: z.number().int().min(3).max(20),
    lockoutMinutes: z.number().int().min(1).max(1440),
    enforce2fa: z.boolean(),
  }),
  audit: z.object({ retentionDays: z.number().int().min(90).max(3650) }),
})
export type SiteSettings = z.infer<typeof siteSettingsSchema>

export const DEFAULT_SETTINGS: SiteSettings = {
  analytics: { enabled: true, requireConsent: true, respectDoNotTrack: true, retentionDays: 395, liveWindowMinutes: 5 },
  contact: { enabled: true, notifyByEmail: false, retentionDays: 730 },
  security: { accessTokenMinutes: 15, sessionDays: 14, maxFailedLogins: 5, lockoutMinutes: 15, enforce2fa: false },
  audit: { retentionDays: 730 },
}
