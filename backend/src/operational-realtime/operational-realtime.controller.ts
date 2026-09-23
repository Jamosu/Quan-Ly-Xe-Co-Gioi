import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { OperationalActor } from '../common/utils/operational-access';
import { OperationalRealtimeService } from './operational-realtime.service';

@ApiTags('Operational Realtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.SUPER_ADMIN, Role.DISPATCHER, Role.FARM_MANAGER, Role.WORKSHOP_MANAGER)
@Controller('operational-realtime')
export class OperationalRealtimeController {
  constructor(private readonly realtime: OperationalRealtimeService) {}

  @Get('stream')
  @ApiOperation({ summary: 'Luồng cập nhật vận hành thời gian thực cho web điều độ' })
  stream(
    @CurrentUser() actor: OperationalActor,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    response.flushHeaders();

    const unsubscribe = this.realtime.subscribe(actor, (event) => {
      response.write(`event: operational-update\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 25_000);
    request.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
      response.end();
    });
  }
}
