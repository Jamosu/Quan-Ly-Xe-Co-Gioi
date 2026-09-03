import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';
export class AcceptTaskDto {
  @ApiProperty() @IsInt() orderId: number;
  @ApiProperty({ enum: ['DISPATCH', 'TRANSPORT'] }) @IsIn(['DISPATCH', 'TRANSPORT']) orderType: 'DISPATCH' | 'TRANSPORT';
}
