import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  acceptInviteSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  reauthSchema,
  resetPasswordSchema,
  totpEnableSchema,
  twoFactorVerifySchema,
} from '@pg/shared'
import { CurrentUser, Public, RequestUser, RequireRecentAuth } from '../common/decorators'
import { ZodPipe } from '../common/zod'
import { AuthService, REFRESH_COOKIE } from './auth.service'
import { CsrfHeaderGuard } from './guards'

type Infer<T extends z.ZodType> = z.infer<T>

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body(new ZodPipe(loginSchema)) b: Infer<typeof loginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(b.email, b.password, b.remember, req, res)
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify2fa(@Body(new ZodPipe(twoFactorVerifySchema)) b: Infer<typeof twoFactorVerifySchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.verifyTwoFactor(b.challengeId, b.code, req, res)
  }

  @Public()
  @UseGuards(CsrfHeaderGuard)
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req, res)
  }

  @Public()
  @UseGuards(CsrfHeaderGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE], undefined, res)
    return { ok: true }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  forgot(@Body(new ZodPipe(forgotPasswordSchema)) b: Infer<typeof forgotPasswordSchema>, @Req() req: Request) {
    return this.auth.forgotPassword(b.email, req)
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  reset(@Body(new ZodPipe(resetPasswordSchema)) b: Infer<typeof resetPasswordSchema>, @Req() req: Request) {
    return this.auth.resetPassword(b.token, b.password, req)
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  acceptInvite(@Body(new ZodPipe(acceptInviteSchema)) b: Infer<typeof acceptInviteSchema>, @Req() req: Request) {
    return this.auth.acceptInvite(b.token, b.password, req)
  }

  @Get('me')
  me(@CurrentUser() u: RequestUser) {
    return this.auth.me(u.id)
  }

  @Post('reauth')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reauth(@Body(new ZodPipe(reauthSchema)) b: Infer<typeof reauthSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.auth.reauth(u.id, u.sessionId, b.password, req)
  }

  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  changePassword(@Body(new ZodPipe(changePasswordSchema)) b: Infer<typeof changePasswordSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.auth.changePassword(u.id, u.sessionId, b.currentPassword, b.newPassword, req)
  }

  @Post('2fa/setup')
  @HttpCode(200)
  @RequireRecentAuth()
  setup2fa(@CurrentUser() u: RequestUser) {
    return this.auth.setupTotp(u.id)
  }

  @Post('2fa/enable')
  @HttpCode(200)
  @RequireRecentAuth()
  enable2fa(@Body(new ZodPipe(totpEnableSchema)) b: Infer<typeof totpEnableSchema>, @CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.auth.enableTotp(u.id, b.code, req)
  }

  @Post('2fa/disable')
  @HttpCode(200)
  @RequireRecentAuth()
  disable2fa(@CurrentUser() u: RequestUser, @Req() req: Request) {
    return this.auth.disableTotp(u.id, req)
  }
}
