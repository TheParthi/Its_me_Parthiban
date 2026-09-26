import { Module } from '@nestjs/common'
import { BundleService } from './bundle.service'
import { PublicController } from './public.controller'

/** Unauthenticated, read-only portfolio API: published content only. */
@Module({ providers: [BundleService], controllers: [PublicController], exports: [BundleService] })
export class PublicModule {}
