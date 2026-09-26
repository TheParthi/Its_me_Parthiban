import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { z } from 'zod'
import { inviteUserSchema, updateUserSchema } from '@pg/shared'
import { CurrentUser, RequestUser, RequirePermissions, RequireRecentAuth } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { UsersService } from './users.service'

@ApiTags('users')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  list() {
    return this.users.list()
  }

  @Get('roles')
  @RequirePermissions('users:read')
  roles() {
    return this.users.roles()
  }

  @Post()
  @RequirePermissions('users:write')
  @RequireRecentAuth()
  invite(@Body(new ZodPipe(inviteUserSchema)) b: z.infer<typeof inviteUserSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.users.invite(u, b.email, b.name, b.role, req)
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  @RequireRecentAuth()
  update(@Param('id') id: string, @Body(new ZodPipe(updateUserSchema)) b: z.infer<typeof updateUserSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.users.update(u, id, b, req)
  }

  @Delete(':id')
  @RequirePermissions('users:write')
  @RequireRecentAuth()
  remove(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.users.remove(u, id, req)
  }

  @Post(':id/revoke-sessions')
  @HttpCode(200)
  @RequirePermissions('security:write')
  revoke(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.users.revokeSessions(u, id, req)
  }

  @Get(':id/activity')
  @RequirePermissions('users:read', 'audit:read')
  activity(@Param('id') id: string) {
    return this.users.activity(id)
  }
}
