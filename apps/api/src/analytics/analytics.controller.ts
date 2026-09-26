import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { z } from 'zod'
import { RangeQuery, analyticsBatchSchema, rangeQuerySchema } from '@pg/shared'
import { Public, RequirePermissions } from '../common/decorators'
import { ZodPipe, parse } from '../common/zod'
import { CollectorService } from './collector.service'
import { ReportsService, pageQuerySchema } from './reports.service'

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(
    private readonly collector: CollectorService,
    private readonly reports: ReportsService,
  ) {}

  /** Beacon endpoint. Always 204 so clients learn nothing about filtering. */
  @Post('analytics/events')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(204)
  async collect(@Body() body: unknown, @Req() req: Request) {
    // navigator.sendBeacon posts text/plain, which setup.ts leaves as a string.
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        throw new BadRequestException('Invalid JSON')
      }
    }
    await this.collector.ingest(parse(analyticsBatchSchema, body), req)
  }

  @Get('admin/analytics/overview')
  @RequirePermissions('analytics:read')
  overview(@Query(new ZodPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.reports.overview(q)
  }

  @Get('admin/analytics/projects')
  @RequirePermissions('analytics:read')
  projects(@Query(new ZodPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.reports.projects(q)
  }

  @Get('admin/analytics/sources')
  @RequirePermissions('analytics:read')
  sources(@Query(new ZodPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.reports.sources(q)
  }

  @Get('admin/analytics/journeys')
  @RequirePermissions('analytics:read')
  journeys(@Query(new ZodPipe(rangeQuerySchema)) q: RangeQuery) {
    return this.reports.journeys(q)
  }

  @Get('admin/analytics/sessions')
  @RequirePermissions('analytics:sessions')
  sessions(@Query(new ZodPipe(pageQuerySchema)) q: z.infer<typeof pageQuerySchema>) {
    return this.reports.sessions(q)
  }

  @Get('admin/analytics/sessions/:id')
  @RequirePermissions('analytics:sessions')
  session(@Param('id') id: string) {
    return this.reports.session(id)
  }

  @Get('admin/analytics/live')
  @RequirePermissions('analytics:sessions')
  live() {
    return this.reports.live()
  }
}
