import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ProjectInput, id, projectInputSchema } from '@pg/shared'
import { z } from 'zod'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { ProjectsService } from './projects.service'

export const reorderSchema = z.object({ ids: z.array(id).max(1000) })
const publishSchema = z.object({ at: z.iso.datetime({ offset: true }).optional() }).optional()

@ApiTags('content')
@Controller('admin/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions('content:read')
  list(@Query('q') q?: string, @Query('status') status?: string, @Query('trash') trash?: string) {
    return this.projects.list({ q: q?.slice(0, 100), status, trash: trash === 'true' })
  }

  @Post('reorder')
  @HttpCode(200)
  @RequirePermissions('content:write')
  reorder(@Body(new ZodPipe(reorderSchema)) b: z.infer<typeof reorderSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.reorder(u, b.ids, req)
  }

  @Get(':id')
  @RequirePermissions('content:read')
  get(@Param('id') id: string) {
    return this.projects.get(id)
  }

  @Post()
  @RequirePermissions('content:write')
  create(@Body(new ZodPipe(projectInputSchema)) b: ProjectInput, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.create(u, b, req)
  }

  @Patch(':id')
  @RequirePermissions('content:write')
  update(@Param('id') id: string, @Body() b: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.update(u, id, b, req)
  }

  @Post(':id/duplicate')
  @RequirePermissions('content:write')
  duplicate(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.duplicate(u, id, req)
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  publish(@Param('id') id: string, @Body(new ZodPipe(publishSchema)) b: z.infer<typeof publishSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.publish(u, id, b?.at, req)
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  unpublish(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.unpublish(u, id, req)
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  archive(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.archive(u, id, req)
  }

  @Delete(':id')
  @RequirePermissions('content:delete')
  remove(@Param('id') id: string, @Query('permanent') permanent: string | undefined, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.remove(u, id, permanent === 'true', req)
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions('content:delete')
  restore(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.projects.restore(u, id, req)
  }
}
