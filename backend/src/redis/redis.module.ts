import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global() makes RedisService available across the entire app
 * without needing to re-import RedisModule in every feature module.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
