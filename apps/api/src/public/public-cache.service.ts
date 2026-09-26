import { Global, Injectable, Module } from '@nestjs/common'

/**
 * In-memory cache for the public bundle. Any write that can change what the
 * public site shows (publish, unpublish, media replace/alt edit, appearance…)
 * must call invalidate(). Single-instance deployments only; swap for Redis
 * if the API is ever scaled horizontally.
 */
@Injectable()
export class PublicCacheService {
  private store = new Map<string, { value: unknown; etag: string }>()
  private version = Date.now()

  get<T>(key: string): { value: T; etag: string } | undefined {
    return this.store.get(key) as { value: T; etag: string } | undefined
  }

  set(key: string, value: unknown, etag: string) {
    this.store.set(key, { value, etag })
  }

  invalidate() {
    this.store.clear()
    this.version = Date.now()
  }

  /** Changes on every invalidation; exposed as PublicBundle.version. */
  get currentVersion() {
    return String(this.version)
  }
}

@Global()
@Module({ providers: [PublicCacheService], exports: [PublicCacheService] })
export class PublicCacheModule {}
