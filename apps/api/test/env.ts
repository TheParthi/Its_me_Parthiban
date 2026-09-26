// Test environment: isolated database and throwaway secrets.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://krishna@localhost:5432/portfolio_test?schema=public'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-123456'
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.IP_HASH_SALT = 'test-ip-hash-salt-value'
process.env.ADMIN_ORIGIN = 'http://admin.test'
process.env.PUBLIC_SITE_URL = 'http://site.test/'
process.env.PUBLIC_SITE_ORIGINS = 'http://site.test'
process.env.COOKIE_SECURE = 'false'
process.env.STORAGE_DRIVER = 'local'
process.env.LOCAL_UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'pg-test-uploads')
process.env.MEDIA_PUBLIC_BASE_URL = 'http://api.test/media'
