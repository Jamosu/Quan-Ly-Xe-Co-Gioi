import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
export class SchedulerFilterDto {
  @ApiProperty() @Type(() => Date) @IsDate() start: Date;
  @ApiProperty() @Type(() => Date) @IsDate() end: Date;
}
