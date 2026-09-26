import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { env } from './config/env'
import { configureApp } from './setup'

async function bootstrap() {
  const e = env() // fail fast on bad configuration
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  configureApp(app)
  app.enableShutdownHooks()
  await app.listen(e.PORT)
  new Logger('Bootstrap').log(`API listening on :${e.PORT} — docs at /api/docs`)
}
bootstrap()
