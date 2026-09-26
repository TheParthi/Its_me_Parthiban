import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { env } from '../config/env'
import { randomToken, sha256 } from '../common/crypto'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { VersionsService } from './versions.service'

@ApiTags('content')
@Controller('admin/versions')
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  // Declared before `:entityType/:entityId`, which would otherwise match `item/<id>`.
  @Get('item/:versionId')
  @RequirePermissions('content:read')
  get(@Param('versionId') id: string) {
    return this.versions.get(id)
  }

  @Post('item/:versionId/restore')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  restore(@Param('versionId') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.versions.restore(u, id, req)
  }

  @Get(':entityType/:entityId')
  @RequirePermissions('content:read')
  list(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.versions.list(entityType, entityId)
  }
}

export const PREVIEW_TTL_MS = 15 * 60_000

@ApiTags('content')
@Controller('admin/preview-token')
export class PreviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Short-lived token that lets the portfolio render drafts. Only the hash is stored. */
  @Post()
  @RequirePermissions('content:read')
  async create(@CurrentUser() u: RequestUser, @Req() req: Request) {
    const token = randomToken()
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS)
    await this.prisma.authToken.create({ data: { type: 'PREVIEW', userId: u.id, tokenHash: sha256(token), expiresAt } })
    await this.audit.record({ action: 'preview.create', actor: u, resourceType: 'preview', req })
    const url = new URL(env().PUBLIC_SITE_URL)
    url.searchParams.set('preview', token)
    return { token, url: url.toString(), expiresAt: expiresAt.toISOString() }
  }
}
