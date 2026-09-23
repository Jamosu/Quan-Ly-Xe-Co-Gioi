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

  @ApiProperty({ type: Object, required: false })
  complexCounts?: Record<string, number>;

  @ApiProperty({ type: Object, required: false })
  regionCounts?: Record<string, number>;

  @ApiProperty({ type: Object, required: false })
  unitCounts?: Record<string, number>;

  @ApiProperty({ type: Object, required: false })
  locationCounts?: Record<string, number>;

  @ApiProperty({ type: Object, required: false })
  assetGroupCounts?: Record<string, number>;

  @ApiProperty({ type: Object, required: false })
  unassignedCounts?: Record<string, number>;

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

  @ApiProperty({ type: [Object] })
  managers: Array<Record<string, unknown>>;
}
