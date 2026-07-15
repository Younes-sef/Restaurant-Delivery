import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

/**
 * CartModule
 *
 * Encapsulates the Redis-backed shopping cart feature.
 *
 * Dependencies satisfied by the global module tree:
 *  - PrismaService  → via PrismaModule (@Global)
 *  - RedisService   → via RedisModule  (@Global)
 *
 * CartService is exported so OrderModule can call `clearCart()` during
 * checkout without needing to re-import the full CartModule.
 */
@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
