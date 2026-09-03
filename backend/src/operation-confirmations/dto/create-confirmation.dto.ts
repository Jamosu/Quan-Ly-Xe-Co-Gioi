import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OperationConfirmationType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateConfirmationDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: OperationConfirmationType }) @IsEnum(OperationConfirmationType) type: OperationConfirmationType;
  @ApiPropertyOptional() @IsOptional() @IsInt() dispatchOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() transportOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grossWeightTons?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tareWeightTons?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) netWeightTons?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) measuredAreaHa?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) machineHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() routeLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
