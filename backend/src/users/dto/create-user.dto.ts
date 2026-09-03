import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Unit } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'TX-NT1-008', description: 'Mã nhân sự / Mã TX' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'driver.hung', description: 'Tên tài khoản' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu khởi tạo' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Lê Văn Hùng', description: 'Họ và tên' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '0977889900' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, default: Role.DRIVER })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ enum: Unit, default: Unit.NT1 })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
