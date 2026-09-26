/**
 * Provisions an administrator from the command line. There is no public
 * registration: this is the only way to create the first Super Admin.
 *
 *   npm run admin:create                         # interactive, hidden password
 *   ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run admin:create   # CI / servers
 *
 * Refuses to create a second Super Admin unless --additional is passed.
 */
import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'
import { createInterface } from 'readline'
import { passwordSchema, ROLES } from '@pg/shared'

const prisma = new PrismaClient()

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      // Mask typed characters.
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput
      ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.startsWith(question)) write.call(rl, question)
        else write.call(rl, '*')
      }
    }
    rl.question(question, (a) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(a.trim())
    })
  })
}

async function main() {
  const additional = process.argv.includes('--additional')
  const roleArg = process.argv.find((a) => a.startsWith('--role='))?.split('=')[1] ?? 'SUPER_ADMIN'
  if (!(ROLES as readonly string[]).includes(roleArg)) throw new Error(`Unknown role ${roleArg}`)

  const role = await prisma.role.findUnique({ where: { name: roleArg } })
  if (!role) throw new Error('Roles are missing. Run `npm run db:seed` first.')

  const existingSa = await prisma.adminUser.count({ where: { role: { name: 'SUPER_ADMIN' } } })
  if (roleArg === 'SUPER_ADMIN' && existingSa > 0 && !additional) {
    throw new Error('A Super Admin already exists. Invite more admins from the dashboard, or pass --additional.')
  }

  const email = (process.env.ADMIN_EMAIL ?? (await ask('Email: '))).toLowerCase()
  const name = process.env.ADMIN_NAME ?? (await ask('Name: '))
  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    password = await ask('Password (min 12 chars, upper/lower/number): ', true)
    const again = await ask('Repeat password: ', true)
    if (password !== again) throw new Error('Passwords do not match')
  }
  const check = passwordSchema.safeParse(password)
  if (!check.success) throw new Error(check.error.issues[0].message)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email')
  if (await prisma.adminUser.findUnique({ where: { email } })) throw new Error('That email is already an administrator')

  const passwordHash = await hash(password, { algorithm: 2 /* Argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  const user = await prisma.adminUser.create({ data: { email, name: name || email, passwordHash, roleId: role.id, passwordChangedAt: new Date() } })
  await prisma.adminAuditLog.create({ data: { action: 'user.provisioned_cli', actorId: null, actorEmail: 'cli', resourceType: 'user', resourceId: user.id, metadata: { email, role: roleArg } } })
  console.log(`✓ Created ${roleArg} ${email}`)
}

main()
  .catch((e) => {
    console.error(`✗ ${e.message}`)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
