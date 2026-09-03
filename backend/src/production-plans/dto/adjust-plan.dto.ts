import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { UpdatePlanDto } from './update-plan.dto';

export class AdjustPlanDto extends UpdatePlanDto {
  @ApiProperty() @IsString() @MinLength(3) reason: string;
}
