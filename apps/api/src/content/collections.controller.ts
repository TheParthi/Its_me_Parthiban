import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Type } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { COLLECTIONS, Collection } from '@pg/shared'
import { z } from 'zod'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { COLLECTION_KIND, EntriesService } from './entries.service'
import { reorderSchema } from './projects.controller'

/**
 * One controller class per collection, each with a static path, so a generic
 * `admin/:collection` route can never shadow other modules' `/admin/*` routes.
 */
function collectionController(collection: Collection): Type<unknown> {
  const kind = COLLECTION_KIND[collection]

  @ApiTags('content')
  @Controller(`admin/${collection}`)
  class CollectionController {
    constructor(readonly entries: EntriesService) {}

    @Get()
    @RequirePermissions('content:read')
    list(@Query('q') q?: string, @Query('status') status?: string, @Query('trash') trash?: string) {
      return this.entries.list(kind, { q, status, trash: trash === 'true' })
    }

    @Post()
    @RequirePermissions('content:write')
    create(@Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.create(u, kind, body, req)
    }

    @Post('reorder')
    @HttpCode(200)
    @RequirePermissions('content:write')
    reorder(@Body(new ZodPipe(reorderSchema)) b: z.infer<typeof reorderSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.reorder(u, kind, b.ids, req)
    }

    @Get(':id')
    @RequirePermissions('content:read')
    get(@Param('id') id: string) {
      return this.entries.get(kind, id)
    }

    @Patch(':id')
    @RequirePermissions('content:write')
    update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.update(u, kind, id, body, req)
    }

    @Post(':id/publish')
    @HttpCode(200)
    @RequirePermissions('content:publish')
    publish(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.publish(u, kind, id, req)
    }

    @Post(':id/unpublish')
    @HttpCode(200)
    @RequirePermissions('content:publish')
    unpublish(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.unpublish(u, kind, id, req)
    }

    @Delete(':id')
    @RequirePermissions('content:delete')
    remove(@Param('id') id: string, @Query('permanent') permanent: string | undefined, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.remove(u, kind, id, permanent === 'true', req)
    }

    @Post(':id/restore')
    @HttpCode(200)
    @RequirePermissions('content:delete')
    restore(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
      return this.entries.restore(u, kind, id, req)
    }
  }
  Object.defineProperty(CollectionController, 'name', { value: `${kind[0].toUpperCase()}${kind.slice(1)}Controller` })
  return CollectionController
}

export const COLLECTION_CONTROLLERS = COLLECTIONS.map(collectionController)
