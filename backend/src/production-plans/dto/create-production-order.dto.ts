import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateProductionOrderDto {
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() planItemId?: number;
  @ApiProperty({ enum: Unit }) @IsEnum(Unit) unit: Unit;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() plannedStart?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() plannedEnd?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
