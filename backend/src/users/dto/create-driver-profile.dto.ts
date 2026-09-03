import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import {
  DriverEmploymentStatus,
  DriverLicenseClass,
  DriverShiftStatus,
  Unit,
} from '@prisma/client';

export class CreateDriverProfileDto {
  @ApiProperty({ example: 'TX-NT1-011' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'driver.nguyen' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ example: '123456', description: 'Mật khẩu khởi tạo, nếu để trống mặc định là 123456' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Unit })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ enum: DriverEmploymentStatus })
  @IsOptional()
  @IsEnum(DriverEmploymentStatus)
  employmentStatus?: DriverEmploymentStatus;

  @ApiProperty({ example: '2021-03-10' })
  @IsDateString()
  joinedDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resignedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resignedReason?: string;

  @ApiPropertyOptional({ enum: DriverLicenseClass })
  @IsOptional()
  @IsEnum(DriverLicenseClass)
  licenseClass?: DriverLicenseClass;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  healthCheckExpiryDate?: string;

  @ApiPropertyOptional({ enum: DriverShiftStatus })
  @IsOptional()
  @IsEnum(DriverShiftStatus)
  currentShiftStatus?: DriverShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedVehicleId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enterprise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  idCardIssueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idCardIssuePlace?: string;
}
