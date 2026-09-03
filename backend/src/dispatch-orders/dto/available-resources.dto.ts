import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional } from 'class-validator';

export class AvailableResourcesDto {
  @ApiProperty() @Type(() => Date) @IsDate() start: Date;
  @ApiProperty() @Type(() => Date) @IsDate() end: Date;
  @ApiPropertyOptional({ enum: Unit }) @IsOptional() @IsEnum(Unit) unit?: Unit;
  @ApiPropertyOptional() @IsOptional() @IsInt() vehicleTypeId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() excludeDispatchId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() excludeTransportId?: number;
}
