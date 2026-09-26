import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, rm, writeFile } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import { env } from '../config/env'

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>
  delete(key: string): Promise<void>
  url(key: string): string
}

export const STORAGE = Symbol('STORAGE')

/** Keys are generated server-side; anything else is refused. */
const KEY = /^[a-z]+\/\d{4}\/\d{2}\/[a-z0-9]+\.[a-z0-9]+$/
function assertKey(key: string) {
  if (!KEY.test(key)) throw new Error('Invalid storage key')
}

const publicUrl = (key: string) => `${env().MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}`

/** Files on local disk, served by setup.ts at /media. */
export class LocalStorage implements StorageDriver {
  private readonly root = resolve(env().LOCAL_UPLOAD_DIR)

  path(key: string) {
    assertKey(key)
    const p = resolve(join(this.root, key))
    if (!p.startsWith(this.root + sep)) throw new Error('Invalid storage key')
    return p
  }

  async put(key: string, body: Buffer) {
    const p = this.path(key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body, { flag: 'wx' })
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true })
  }

  url(key: string) {
    return publicUrl(key)
  }
}

/** S3 or any S3-compatible store (R2, MinIO…) via S3_ENDPOINT. */
export class S3Storage implements StorageDriver {
  private readonly e = env()
  private readonly client = new S3Client({
    region: this.e.S3_REGION,
    endpoint: this.e.S3_ENDPOINT || undefined,
    forcePathStyle: this.e.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: this.e.S3_ACCESS_KEY_ID!, secretAccessKey: this.e.S3_SECRET_ACCESS_KEY! },
  })

  async put(key: string, body: Buffer, contentType: string) {
    assertKey(key)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.e.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', // keys are never reused
      }),
    )
  }

  async delete(key: string) {
    assertKey(key)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.e.S3_BUCKET, Key: key }))
  }

  url(key: string) {
    return publicUrl(key)
  }
}

export const createStorage = (): StorageDriver => (env().STORAGE_DRIVER === 's3' ? new S3Storage() : new LocalStorage())
