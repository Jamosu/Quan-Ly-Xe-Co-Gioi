import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { LoginDto } from './login.dto';

export class MobileLoginDto extends LoginDto {
  @ApiProperty({ description: 'Stable mobile installation identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  deviceId: string;
}

export class MobileRefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  deviceId: string;
}
