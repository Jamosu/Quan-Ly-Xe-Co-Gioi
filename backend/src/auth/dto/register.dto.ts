import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Unit } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'driver.trong', description: 'Tên đăng nhập' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Trần Đình Trọng', description: 'Họ và tên' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '0988123456', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, default: Role.DRIVER, description: 'Vai trò người dùng' })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ enum: Unit, default: Unit.NT1, description: 'Đơn vị công tác' })
  @IsEnum(Unit)
  unit: Unit;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
