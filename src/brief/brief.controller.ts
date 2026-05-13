import { Body, Controller, Post } from '@nestjs/common';
import { BriefService } from './brief.service';
import { TransformBriefDto } from './dto/transform-brief.dto';

@Controller('briefs')
export class BriefController {
  constructor(private readonly briefService: BriefService) {}

  @Post('transform')
  async transform(@Body() dto: TransformBriefDto) {
    return this.briefService.transform(dto.text);
  }
}
