import { PartialType } from '@nestjs/swagger';
import { CreateTransportOrderDto } from './create-transport-order.dto';

export class UpdateTransportOrderDto extends PartialType(CreateTransportOrderDto) {}
