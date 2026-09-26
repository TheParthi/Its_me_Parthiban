import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { z } from 'zod'
import { CurrentUser, Public, RequestUser, RequirePermissions } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { ContactService, contactInputSchema, messageExportSchema, messageListSchema, messageStatusSchema } from './contact.service'

@ApiTags('contact')
@Controller()
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post('public/contact')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  submit(@Body(new ZodPipe(contactInputSchema)) b: z.infer<typeof contactInputSchema>) {
    return this.contact.submit(b)
  }

  @Get('admin/messages')
  @RequirePermissions('messages:read')
  list(@Query(new ZodPipe(messageListSchema)) q: z.infer<typeof messageListSchema>) {
    return this.contact.list(q)
  }

  @Post('admin/messages/export')
  @HttpCode(200)
  @RequirePermissions('messages:write')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="messages.csv"')
  @Header('Cache-Control', 'no-store')
  export(@Body(new ZodPipe(messageExportSchema)) b: z.infer<typeof messageExportSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.contact.exportCsv(u, b.ids, req)
  }

  @Get('admin/messages/:id')
  @RequirePermissions('messages:read')
  get(@Param('id') id: string) {
    return this.contact.get(id)
  }

  @Patch('admin/messages/:id')
  @RequirePermissions('messages:write')
  setStatus(@Param('id') id: string, @Body(new ZodPipe(messageStatusSchema)) b: z.infer<typeof messageStatusSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.contact.setStatus(u, id, b.status, req)
  }

  @Delete('admin/messages/:id')
  @RequirePermissions('messages:write')
  remove(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.contact.remove(u, id, req)
  }
}
