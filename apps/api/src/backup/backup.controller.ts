import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { CurrentUser, RequestUser, RequirePermissions, RequireRecentAuth } from '../common/decorators'
import { BackupService } from './backup.service'

@ApiTags('backup')
@Controller('admin/backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get('export')
  @RequirePermissions('backup:export')
  export(@CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.backup.export(u, req)
  }

  /** Replaces all content. `?confirm=RESTORE` guards against accidental calls. */
  @Post('restore')
  @HttpCode(200)
  @RequirePermissions('backup:restore')
  @RequireRecentAuth()
  restore(@Query('confirm') confirm: string | undefined, @Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    if (confirm !== 'RESTORE') throw new BadRequestException('Add ?confirm=RESTORE to replace all content')
    return this.backup.restore(u, body, req)
  }
}
