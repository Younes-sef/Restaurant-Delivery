import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';
import { MenuModule } from './menu/menu.module';
import { CartModule } from './cart/cart.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    // --- Rate Limiting (DoS Protection) ---
    // Global limit: 100 requests per 60 seconds per IP.
    // Individual endpoints can override with @Throttle() decorator.
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests
      },
    ]),

    // --- Infrastructure ---
    // RedisModule is @Global(), so RedisService is available everywhere.
    RedisModule,
    PrismaModule,
    EventEmitterModule.forRoot(),

    // --- Feature Modules ---
    UsersModule,
    AuthModule,
    MenuModule,
    CartModule,
    OrdersModule,
    DeliveriesModule,
    KitchenModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register ThrottlerGuard globally so every route is rate-limited
    // without needing to apply @UseGuards(ThrottlerGuard) manually.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
