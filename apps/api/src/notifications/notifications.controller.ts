import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../common/decorators'
import { NotificationsService } from './notifications.service'

@ApiTags('notifications')
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: RequestUser) {
    return this.svc.forUser(u.id, u.permissions)
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: RequestUser) {
    return this.svc.markRead(u.id, u.permissions)
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.svc.markRead(u.id, u.permissions, id)
  }
}
