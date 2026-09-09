import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DispatchOrdersModule } from './dispatch-orders/dispatch-orders.module';
import { DriverKpiModule } from './driver-kpi/driver-kpi.module';
import { FuelModule } from './fuel/fuel.module';
import { ImplementsModule } from './implements/implements.module';
import { InternalFeedModule } from './internal-feed/internal-feed.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OperationConfirmationsModule } from './operation-confirmations/operation-confirmations.module';
import { MobileDriverModule } from './mobile-driver/mobile-driver.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionPlansModule } from './production-plans/production-plans.module';
import { RepairsModule } from './repairs/repairs.module';
import { TransportModule } from './transport/transport.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AvailabilityModule } from './availability/availability.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { VehicleDriverAssignmentsModule } from './vehicle-driver-assignments/vehicle-driver-assignments.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    ImplementsModule,
    ProductionPlansModule,
    DispatchOrdersModule,
    TransportModule,
    InternalFeedModule,
    FuelModule,
    MaintenanceModule,
    OperationConfirmationsModule,
    RepairsModule,
    DriverKpiModule,
    DashboardModule,
    MobileDriverModule,
    CatalogsModule,
    AvailabilityModule,
    WorkOrdersModule,
    VehicleDriverAssignmentsModule,
    AlertsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
