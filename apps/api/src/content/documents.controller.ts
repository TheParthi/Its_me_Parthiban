import { Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { assertPerms } from './content-utils'
import { DocumentsService, docKey } from './documents.service'

/**
 * Singleton documents. Profile is content; homepage/appearance/SEO are site
 * configuration and additionally need site:write, so those checks are per key.
 */
@ApiTags('content')
@Controller('admin/documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post('appearance/reset')
  @HttpCode(200)
  @RequirePermissions('site:write')
  reset(@CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.docs.resetAppearance(u, req)
  }

  @Get(':key')
  @RequirePermissions('content:read')
  get(@Param('key') key: string) {
    return this.docs.get(docKey(key))
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    const k = docKey(key)
    assertPerms(u, k === 'profile' ? 'content:write' : 'site:write')
    return this.docs.update(u, k, body, req)
  }

  @Post(':key/publish')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  publish(@Param('key') key: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    const k = docKey(key)
    if (k !== 'profile') assertPerms(u, 'site:write')
    return this.docs.publish(u, k, req)
  }

  @Post(':key/discard')
  @HttpCode(200)
  @RequirePermissions('content:write')
  discard(@Param('key') key: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    const k = docKey(key)
    if (k !== 'profile') assertPerms(u, 'site:write')
    return this.docs.discard(u, k, req)
  }
}
