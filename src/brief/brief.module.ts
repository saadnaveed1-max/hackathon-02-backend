import { Module } from '@nestjs/common';
import { BriefController } from './brief.controller';
import { BriefService } from './brief.service';
import { OpenaiBriefClient } from './openai-brief.client';

@Module({
  controllers: [BriefController],
  providers: [BriefService, OpenaiBriefClient],
  exports: [BriefService],
})
export class BriefModule {}
