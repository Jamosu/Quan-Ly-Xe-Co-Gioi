import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ProxyDispatchProgressAction {
  ARRIVE_WORKSITE = 'ARRIVE_WORKSITE',
  START_WORK = 'START_WORK',
  COMPLETE_WORK = 'COMPLETE_WORK',
  ACCEPT_QUANTITY = 'ACCEPT_QUANTITY',
  RETURN_TO_DEPOT = 'RETURN_TO_DEPOT',
  ARRIVE_DEPOT = 'ARRIVE_DEPOT',
}

export class ProxyProgressDto {
  @IsEnum(ProxyDispatchProgressAction)
  action!: ProxyDispatchProgressAction;

  @IsString()
  reason!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}
