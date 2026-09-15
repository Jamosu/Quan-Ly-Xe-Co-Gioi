import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ProximityRecommendationDto {
  @ApiProperty() @Type(() => Number) @IsInt() workOrderId: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() destinationLocationId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) targetLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) targetLng?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) @IsDate() plannedStartAt?: Date;
  @ApiPropertyOptional({ default: 60 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(240) finishingWindowMinutes?: number;
}
