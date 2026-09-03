import { Module } from '@nestjs/common';
import { MobileDriverController } from './mobile-driver.controller';
import { MobileDriverService } from './mobile-driver.service';

@Module({
  controllers: [MobileDriverController],
  providers: [MobileDriverService],
  exports: [MobileDriverService],
})
export class MobileDriverModule {}
