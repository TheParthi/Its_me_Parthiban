import { Global, Module } from '@nestjs/common'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Global()
@Module({ providers: [SettingsService], controllers: [SettingsController], exports: [SettingsService] })
export class SettingsModule {}
