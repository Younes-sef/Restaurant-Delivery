import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * OrdersModule
 *
 * No explicit imports needed for PrismaService or RedisService because
 * both PrismaModule and RedisModule are decorated with @Global(),
 * making their services available application-wide.
 */
@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // exported so future modules (e.g. DeliveryModule) can call clearCart etc.
})
export class OrdersModule {}
