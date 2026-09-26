import { Module } from '@nestjs/common'
import { COLLECTION_CONTROLLERS } from './collections.controller'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { EntriesService } from './entries.service'
import { ProjectsController } from './projects.controller'
import { ProjectsService } from './projects.service'
import { ContentScheduler } from './scheduler.service'
import { SkillCategoriesService } from './skill-categories.service'
import { SkillCategoriesController, SkillsController } from './skills.controller'
import { PreviewController, VersionsController } from './versions.controller'
import { VersionsService } from './versions.service'

/** Profile, homepage, appearance, SEO, projects, skills, collections, versions. */
@Module({
  controllers: [
    DocumentsController,
    ProjectsController,
    SkillCategoriesController,
    SkillsController,
    ...COLLECTION_CONTROLLERS,
    VersionsController,
    PreviewController,
  ],
  providers: [DocumentsService, ProjectsService, EntriesService, SkillCategoriesService, VersionsService, ContentScheduler],
  exports: [DocumentsService, ProjectsService, EntriesService],
})
export class ContentModule {}
