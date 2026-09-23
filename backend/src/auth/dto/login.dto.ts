import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Tên đăng nhập' })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Thaco@1234$', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MinLength(3, { message: 'Mật khẩu phải có ít nhất 3 ký tự' })
  password: string;
}
