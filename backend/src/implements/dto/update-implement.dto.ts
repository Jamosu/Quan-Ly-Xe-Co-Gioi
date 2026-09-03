import { PartialType } from '@nestjs/swagger';
import { CreateImplementDto } from './create-implement.dto';

export class UpdateImplementDto extends PartialType(CreateImplementDto) {}
