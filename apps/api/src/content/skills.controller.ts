import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { SkillCategoryInput, skillCategorySchema } from '@pg/shared'
import { z } from 'zod'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { ZodPipe, parse } from '../common/zod'
import { pickSent } from './content-utils'
import { EntriesService } from './entries.service'
import { reorderSchema } from './projects.controller'
import { SkillCategoriesService } from './skill-categories.service'

type Reorder = z.infer<typeof reorderSchema>

@ApiTags('content')
@Controller('admin/skill-categories')
export class SkillCategoriesController {
  constructor(private readonly cats: SkillCategoriesService) {}

  @Get()
  @RequirePermissions('content:read')
  list() {
    return this.cats.list()
  }

  @Post()
  @RequirePermissions('content:write')
  create(@Body(new ZodPipe(skillCategorySchema)) b: SkillCategoryInput, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.cats.create(u, b, req)
  }

  @Post('reorder')
  @HttpCode(200)
  @RequirePermissions('content:write')
  reorder(@Body(new ZodPipe(reorderSchema)) b: Reorder, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.cats.reorder(u, b.ids, req)
  }

  @Patch(':id')
  @RequirePermissions('content:write')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.cats.update(u, id, pickSent(parse(skillCategorySchema.partial(), body), body), req)
  }

  @Delete(':id')
  @RequirePermissions('content:delete')
  remove(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.cats.remove(u, id, req)
  }
}

@ApiTags('content')
@Controller('admin/skills')
export class SkillsController {
  constructor(private readonly entries: EntriesService) {}

  @Get()
  @RequirePermissions('content:read')
  list(@Query('q') q?: string, @Query('status') status?: string, @Query('trash') trash?: string) {
    return this.entries.list('skill', { q, status, trash: trash === 'true' })
  }

  @Post()
  @RequirePermissions('content:write')
  create(@Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.create(u, 'skill', body, req)
  }

  @Post('reorder')
  @HttpCode(200)
  @RequirePermissions('content:write')
  reorder(@Body(new ZodPipe(reorderSchema)) b: Reorder, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.reorder(u, 'skill', b.ids, req)
  }

  @Post('publish-all')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  publishAll(@CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.publishAll(u, 'skill', req)
  }

  @Get(':id')
  @RequirePermissions('content:read')
  get(@Param('id') id: string) {
    return this.entries.get('skill', id)
  }

  @Patch(':id')
  @RequirePermissions('content:write')
  update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.update(u, 'skill', id, body, req)
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  publish(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.publish(u, 'skill', id, req)
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequirePermissions('content:publish')
  unpublish(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.unpublish(u, 'skill', id, req)
  }

  @Delete(':id')
  @RequirePermissions('content:delete')
  remove(@Param('id') id: string, @Query('permanent') permanent: string | undefined, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.remove(u, 'skill', id, permanent === 'true', req)
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions('content:delete')
  restore(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.entries.restore(u, 'skill', id, req)
  }
}
