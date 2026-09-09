import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalActor } from '../common/utils/operational-access';
import { AvailabilityService } from './availability.service';
import { AvailabilitySearchDto } from './dto/availability-search.dto';

@ApiTags('Availability - Lịch xe và tài xế')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Post('search')
  search(@Body() dto: AvailabilitySearchDto, @CurrentUser() actor: OperationalActor) {
    return this.service.search(dto, actor);
  }
}
