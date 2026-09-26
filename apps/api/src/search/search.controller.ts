import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../common/decorators'
import { SearchService } from './search.service'

@ApiTags('search')
@Controller('admin/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** Any signed-in admin; groups are filtered by the caller's permissions. */
  @Get()
  find(@Query('q') q: string | undefined, @CurrentUser() u: RequestUser) {
    return this.search.search(q ?? '', u.permissions)
  }
}
