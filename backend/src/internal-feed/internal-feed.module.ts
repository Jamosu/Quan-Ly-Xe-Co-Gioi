import { Module } from '@nestjs/common';
import { InternalFeedController } from './internal-feed.controller';
import { InternalFeedService } from './internal-feed.service';

@Module({
  controllers: [InternalFeedController],
  providers: [InternalFeedService],
  exports: [InternalFeedService],
})
export class InternalFeedModule {}
