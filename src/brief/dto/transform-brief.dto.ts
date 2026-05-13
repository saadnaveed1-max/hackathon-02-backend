import { IsString, MaxLength, MinLength } from 'class-validator';

export class TransformBriefDto {
  @IsString()
  @MinLength(1, { message: 'Brief text must not be empty.' })
  @MaxLength(100_000, { message: 'Brief text exceeds maximum length.' })
  text: string;
}
