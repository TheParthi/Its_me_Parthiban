import { INestApplication, Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import express, { Request } from 'express'
import helmet from 'helmet'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { env, publicOrigins } from './config/env'

// BigInt ids (audit log, analytics events) serialise as strings in JSON.
;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString()
}

/** Shared by main.ts and the e2e tests so both run the same middleware. */
export function configureApp(app: INestApplication) {
  const e = env()
  const x = app as NestExpressApplication
  if (e.TRUST_PROXY) x.set('trust proxy', 1)
  x.disable('x-powered-by')
  app.setGlobalPrefix('api')

  const mediaOrigin = new URL(e.MEDIA_PUBLIC_BASE_URL).origin
  const siteOrigin = new URL(e.PUBLIC_SITE_URL).origin
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', mediaOrigin],
          connectSrc: ["'self'"],
          frameSrc: [siteOrigin],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // media is embedded by the portfolio
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.text({ type: 'text/plain', limit: '64kb' })) // sendBeacon analytics

  // CORS: the admin origin may send credentials; portfolio origins may only
  // call the public and analytics endpoints, without credentials.
  const publics = publicOrigins()
  app.enableCors((req: Request, cb: (err: Error | null, options: Record<string, unknown>) => void) => {
    const origin = req.header('Origin')
    const path = req.path || req.url
    if (origin && origin === e.ADMIN_ORIGIN) return cb(null, { origin: true, credentials: true, maxAge: 600 })
    const isPublicRoute = /^\/api\/(public|analytics\/events)(\/|$)/.test(path)
    if (origin && isPublicRoute && (publics.includes(origin) || publics.includes('*'))) {
      return cb(null, { origin: true, credentials: false, methods: ['GET', 'POST'], maxAge: 600 })
    }
    cb(null, { origin: false })
  })

  if (e.STORAGE_DRIVER === 'local') {
    const dir = resolve(e.LOCAL_UPLOAD_DIR)
    app.use(
      '/media',
      express.static(dir, {
        index: false,
        dotfiles: 'deny',
        maxAge: '365d',
        immutable: true,
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox")
        },
      }),
    )
  }

  if (e.ADMIN_DIST_DIR && existsSync(e.ADMIN_DIST_DIR)) {
    const dir = resolve(e.ADMIN_DIST_DIR)
    app.use('/admin', express.static(dir, { index: false, maxAge: '1h' }))
    app.use('/admin', (_req: Request, res: express.Response) => res.sendFile(join(dir, 'index.html')))
  }

  const docs = new DocumentBuilder()
    .setTitle('Portfolio Platform API')
    .setDescription('Public portfolio API, authenticated admin API and first-party analytics.')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, docs)
  app.use('/api/docs', (_req: Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:")
    next()
  })
  SwaggerModule.setup('api/docs', app, document)
  new Logger('Bootstrap').log(`CORS: admin=${e.ADMIN_ORIGIN} public=[${publics.join(', ')}]`)
}
