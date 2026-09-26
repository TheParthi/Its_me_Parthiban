import { BadRequestException, PipeTransform, createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { ZodType } from 'zod'

/** Validates and strips a request body/query with a shared zod schema. */
export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    const r = this.schema.safeParse(value)
    if (!r.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    return r.data
  }
}

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  return new ZodPipe(schema).transform(value)
}

export const RawBody = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().body)
