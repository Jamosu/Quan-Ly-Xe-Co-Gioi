import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { LoginDto } from './login.dto';

export class MobileLoginDto extends LoginDto {
  @ApiProperty({ example: 'android-a1b2c3d4', description: 'Định danh ổn định của bản cài đặt ứng dụng' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  deviceId: string;
}

export class MobileRefreshDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @ApiProperty({ example: 'android-a1b2c3d4' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;
}
