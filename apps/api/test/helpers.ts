import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { hash } from '@node-rs/argon2'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, ROLES, RoleName } from '@pg/shared'
import { AppModule } from '../src/app.module'
import { configureApp } from '../src/setup'
import { ThrottlerStorage } from '@nestjs/throttler'

export const PASSWORD = 'Correct-Horse-9-battery'

export async function createApp(): Promise<INestApplication> {
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    // Rate limits are exercised explicitly where they matter; disable elsewhere.
    .overrideProvider(ThrottlerStorage)
    .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }) })
    .compile()
  const app = mod.createNestApplication({ bodyParser: false })
  configureApp(app)
  await app.init()
  return app
}

export async function resetDb(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
  for (const key of PERMISSIONS) await prisma.permission.create({ data: { key } })
  const perms = await prisma.permission.findMany()
  for (const name of ROLES) {
    const role = await prisma.role.create({ data: { name, label: ROLE_LABELS[name] } })
    await prisma.rolePermission.createMany({
      data: perms.filter((p) => (ROLE_PERMISSIONS[name] as readonly string[]).includes(p.key)).map((p) => ({ roleId: role.id, permissionId: p.id })),
    })
  }
}

let hashed: string | null = null
export async function createUser(prisma: PrismaClient, role: RoleName, email = `${role.toLowerCase()}@test.dev`) {
  hashed ??= await hash(PASSWORD, { algorithm: 2 /* Argon2id */ })
  const r = await prisma.role.findUniqueOrThrow({ where: { name: role } })
  return prisma.adminUser.create({ data: { email, name: role, passwordHash: hashed, roleId: r.id } })
}

/** Logs in and returns the bearer token plus the refresh cookie. */
export async function login(app: INestApplication, email: string, password = PASSWORD) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`login failed ${res.status} ${JSON.stringify(res.body)}`)
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('pg_refresh='))!
  return { token: res.body.accessToken as string, cookie: cookie.split(';')[0], user: res.body.user }
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
