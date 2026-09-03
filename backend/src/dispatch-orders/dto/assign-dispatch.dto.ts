import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional } from 'class-validator';

export class AssignDispatchDto {
  @ApiProperty() @IsInt() vehicleId: number;
  @ApiProperty() @IsInt() driverId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() implementId?: number;
  @ApiProperty() @Type(() => Date) @IsDate() departureTime: Date;
  @ApiProperty() @Type(() => Date) @IsDate() plannedEndTime: Date;
}
