import { Global, Injectable, Logger, Module } from '@nestjs/common'
import nodemailer, { Transporter } from 'nodemailer'
import { env } from '../config/env'

/**
 * Sends email when SMTP is configured. Without SMTP, links are printed to
 * the server log in development only — never in production.
 */
@Injectable()
export class MailerService {
  private readonly log = new Logger('Mailer')
  private transport: Transporter | null = null

  get configured() {
    const e = env()
    return !!(e.SMTP_HOST && e.SMTP_FROM)
  }

  private get t() {
    if (!this.transport) {
      const e = env()
      this.transport = nodemailer.createTransport({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT ?? 587,
        secure: (e.SMTP_PORT ?? 587) === 465,
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
      })
    }
    return this.transport
  }

  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.configured) {
      if (env().NODE_ENV !== 'production') this.log.warn(`[dev mail] to=${to} subject="${subject}"\n${text}`)
      else this.log.error(`SMTP not configured — could not send "${subject}"`)
      return false
    }
    await this.t.sendMail({ from: env().SMTP_FROM, to, subject, text })
    return true
  }
}

@Global()
@Module({ providers: [MailerService], exports: [MailerService] })
export class MailerModule {}
