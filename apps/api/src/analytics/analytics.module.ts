import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { CollectorService } from './collector.service'
import { ReportsService } from './reports.service'

@Module({ controllers: [AnalyticsController], providers: [CollectorService, ReportsService] })
export class AnalyticsModule {}
