import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AnalyticsModule } from './analytics/analytics.module'
import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { AuthGuard, PermissionsGuard } from './auth/guards'
import { BackupModule } from './backup/backup.module'
import { MailerModule } from './common/mailer.service'
import { ContactModule } from './contact/contact.module'
import { ContentModule } from './content/content.module'
import { HealthController } from './health/health.controller'
import { MediaModule } from './media/media.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { PublicModule } from './public/public.module'
import { SearchModule } from './search/search.module'
import { SecurityModule } from './security/security.module'
import { SettingsModule } from './settings/settings.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailerModule,
    AuditModule,
    NotificationsModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    SecurityModule,
    ContentModule,
    MediaModule,
    AnalyticsModule,
    ContactModule,
    PublicModule,
    SearchModule,
    BackupModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit, then authenticate, then authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
