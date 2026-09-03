import { PartialType } from '@nestjs/swagger';
import { CreateTransportItemDto } from './create-transport-order.dto';
export class UpdateTransportItemDto extends PartialType(CreateTransportItemDto) {}
