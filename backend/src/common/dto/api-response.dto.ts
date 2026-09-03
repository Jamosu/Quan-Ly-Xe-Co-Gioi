import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Thao tác thành công' })
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: '2026-08-17T08:00:00.000Z' })
  timestamp: string;
}
