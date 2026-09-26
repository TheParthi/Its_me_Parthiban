import { execSync } from 'child_process'

/** Applies migrations to the isolated test database once per run. */
export default function () {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://krishna@localhost:5432/portfolio_test?schema=public'
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: { ...process.env, DATABASE_URL: url } })
}
