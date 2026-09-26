import { Module } from '@nestjs/common'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { STORAGE, createStorage } from './storage'

@Module({
  controllers: [MediaController],
  providers: [MediaService, { provide: STORAGE, useFactory: createStorage }],
  exports: [MediaService, STORAGE],
})
export class MediaModule {}
