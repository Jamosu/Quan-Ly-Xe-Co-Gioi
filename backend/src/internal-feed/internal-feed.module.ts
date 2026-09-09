import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { InternalFeedController } from './internal-feed.controller';
import { InternalFeedService } from './internal-feed.service';

@Module({
  imports: [AvailabilityModule],
  controllers: [InternalFeedController],
  providers: [InternalFeedService],
  exports: [InternalFeedService],
})
export class InternalFeedModule {}
