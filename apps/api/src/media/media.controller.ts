import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { memoryStorage } from 'multer'
import { z } from 'zod'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { MAX_UPLOAD_BYTES, MediaService, mediaListSchema, mediaUpdateSchema, mediaUploadSchema } from './media.service'

const upload = () => FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })

@ApiTags('media')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @RequirePermissions('media:write')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(upload())
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(mediaUploadSchema)) b: z.infer<typeof mediaUploadSchema>,
    @CurrentUser() u: RequestUser,
    @Req() req: Request,
  ) {
    return this.media.upload(u, file, b, req)
  }

  @Get()
  @RequirePermissions('media:read')
  list(@Query(new ZodPipe(mediaListSchema)) q: z.infer<typeof mediaListSchema>) {
    return this.media.list(q)
  }

  @Patch(':id')
  @RequirePermissions('media:write')
  update(@Param('id') id: string, @Body(new ZodPipe(mediaUpdateSchema)) b: z.infer<typeof mediaUpdateSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.media.update(u, id, b, req)
  }

  @Post(':id/replace')
  @RequirePermissions('media:write')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(upload())
  replace(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.media.replace(u, id, file, req)
  }

  @Get(':id/usage')
  @RequirePermissions('media:read')
  usage(@Param('id') id: string) {
    return this.media.usage(id)
  }

  @Delete(':id')
  @RequirePermissions('media:delete')
  remove(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.media.remove(u, id, req)
  }
}
