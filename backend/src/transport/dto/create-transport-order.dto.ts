import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnDriverStatus, RouteType, TransportFlowType, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateTransportItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() materialCode?: string;
  @ApiProperty() @IsString() cargoName: string;
  @ApiProperty() @IsString() unitOfMeasure: string;
  @ApiProperty() @IsNumber() @Min(0) plannedQuantity: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) actualQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() pickupLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deliveryLocation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sourceRowNumber?: number;
}

export class CreateTransportOrderDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: RouteType }) @IsEnum(RouteType) routeType: RouteType;
  @ApiPropertyOptional({ enum: TransportFlowType }) @IsOptional() @IsEnum(TransportFlowType) flowType?: TransportFlowType;
  @ApiProperty({ enum: Unit }) @IsEnum(Unit) unit: Unit;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() requestDate?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() executionDate?: Date;
  @ApiPropertyOptional() @IsOptional() @IsString() cargoType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tonnage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destination?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vehicleId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() driverId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() trailerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() containerNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportMode?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() departureTime?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() plannedEndTime?: Date;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) distanceKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) plannedFuelLiters?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) palletCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() trailerNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyVehicle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyDriver?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legacyTrailer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnCargoName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() returnTonnage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() returnDestination?: string;
  @ApiPropertyOptional({ enum: ReturnDriverStatus }) @IsOptional() @IsEnum(ReturnDriverStatus) returnDriverStatus?: ReturnDriverStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costSavedVnd?: number;
  @ApiPropertyOptional({ type: [CreateTransportItemDto] }) @IsOptional() @ValidateNested({ each: true }) @Type(() => CreateTransportItemDto) items?: CreateTransportItemDto[];
}
