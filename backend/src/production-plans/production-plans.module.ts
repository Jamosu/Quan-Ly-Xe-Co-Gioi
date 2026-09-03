import { Module } from '@nestjs/common';
import { ProductionPlansController } from './production-plans.controller';
import { ProductionPlansService } from './production-plans.service';

@Module({
  controllers: [ProductionPlansController],
  providers: [ProductionPlansService],
  exports: [ProductionPlansService],
})
export class ProductionPlansModule {}
