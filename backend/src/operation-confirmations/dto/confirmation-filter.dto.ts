import { ApiPropertyOptional } from '@nestjs/swagger';
import { OperationConfirmationStatus, OperationConfirmationType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
export class ConfirmationFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OperationConfirmationType }) @IsOptional() @IsEnum(OperationConfirmationType) type?: OperationConfirmationType;
  @ApiPropertyOptional({ enum: OperationConfirmationStatus }) @IsOptional() @IsEnum(OperationConfirmationStatus) status?: OperationConfirmationStatus;
}
