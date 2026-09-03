import { ApiProperty } from '@nestjs/swagger';

export class VehicleFilterOptionsDto {
  @ApiProperty({ type: [String] })
  complexes: string[];

  @ApiProperty({ type: [String] })
  regions: string[];

  @ApiProperty({ type: [String] })
  assignedUnits: string[];

  @ApiProperty({ type: [String] })
  locations: string[];

  @ApiProperty({ type: [String] })
  assetGroups: string[];

  @ApiProperty({ type: [Object] })
  vehicleTypes: Array<Record<string, unknown>>;

  @ApiProperty({ type: [Object] })
  manufacturers: Array<Record<string, unknown>>;

  @ApiProperty({ type: [Object] })
  models: Array<Record<string, unknown>>;

  @ApiProperty({ type: [String] })
  origins: string[];

  @ApiProperty({ type: [Number] })
  manufactureYears: number[];

  @ApiProperty({ type: [String] })
  statuses: string[];

  @ApiProperty({ type: [String] })
  alertTiers: string[];
}
