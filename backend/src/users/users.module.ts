import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserPresenceService } from './user-presence.service';
import { AvailabilityModule } from '../availability/availability.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AvailabilityModule, AlertsModule],
  controllers: [UsersController],
  providers: [UsersService, UserPresenceService],
  exports: [UsersService, UserPresenceService],
})
export class UsersModule {}
