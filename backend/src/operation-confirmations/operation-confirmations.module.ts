import { Module } from '@nestjs/common';
import { OperationConfirmationsController } from './operation-confirmations.controller';
import { OperationConfirmationsService } from './operation-confirmations.service';
@Module({ controllers: [OperationConfirmationsController], providers: [OperationConfirmationsService] })
export class OperationConfirmationsModule {}
