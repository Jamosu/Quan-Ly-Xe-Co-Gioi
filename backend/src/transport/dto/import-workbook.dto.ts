import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportWorkbookRowDto {
  @ApiProperty() @IsInt() rowNumber: number;
  @ApiProperty({ type: [String] }) @IsArray() values: Array<string | number | null>;
}

export class ImportWorkbookDto {
  @ApiProperty() @IsString() fileName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sheetName?: string;
  @ApiProperty() @IsString() checksum: string;
  @ApiProperty({ type: [ImportWorkbookRowDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ImportWorkbookRowDto) rows: ImportWorkbookRowDto[];
  @ApiProperty({ type: [String] }) @IsArray() merges: string[];
}
