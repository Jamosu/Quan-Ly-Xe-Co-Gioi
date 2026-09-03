import { Module } from '@nestjs/common';
import { ImplementsController } from './implements.controller';
import { ImplementsService } from './implements.service';

@Module({
  controllers: [ImplementsController],
  providers: [ImplementsService],
  exports: [ImplementsService],
})
export class ImplementsModule {}
