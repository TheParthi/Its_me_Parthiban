import { Body, Controller, Get, Put, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { siteSettingsSchema } from '@pg/shared'
import { AuditService } from '../audit/audit.service'
import { env } from '../config/env'
import { CurrentUser, RequestUser, RequirePermissions, RequireRecentAuth } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { SettingsService } from './settings.service'

@ApiTags('settings')
@Controller('admin/settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions('settings:read')
  get() {
    return this.settings.get()
  }

  @Put()
  @RequirePermissions('settings:write')
  @RequireRecentAuth()
  async put(@Body(new ZodPipe(siteSettingsSchema)) body: ReturnType<typeof siteSettingsSchema.parse>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    const before = await this.settings.get()
    const after = await this.settings.update(body, u.id)
    await this.audit.record({ action: 'settings.update', actor: u, resourceType: 'settings', metadata: { before, after }, req })
    return after
  }

  /** Which integrations are configured. Reports presence only, never values. */
  @Get('system')
  @RequirePermissions('settings:read')
  system() {
    const e = env()
    return {
      environment: e.NODE_ENV,
      storage: {
        driver: e.STORAGE_DRIVER,
        configured: e.STORAGE_DRIVER === 'local' || !!(e.S3_BUCKET && e.S3_ACCESS_KEY_ID),
        bucket: e.STORAGE_DRIVER === 's3' ? e.S3_BUCKET : null,
        region: e.S3_REGION ?? null,
      },
      email: { configured: !!(e.SMTP_HOST && e.SMTP_FROM), from: e.SMTP_FROM ?? null },
      publicSiteUrl: e.PUBLIC_SITE_URL,
      publicOrigins: e.PUBLIC_SITE_ORIGINS.split(',').filter(Boolean),
    }
  }
}
