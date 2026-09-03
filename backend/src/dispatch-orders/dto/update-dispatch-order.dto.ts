import { PartialType } from '@nestjs/swagger';
import { CreateDispatchOrderDto } from './create-dispatch-order.dto';

export class UpdateDispatchOrderDto extends PartialType(CreateDispatchOrderDto) {}
