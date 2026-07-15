import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { AuthModule } from '../auth/auth.module';

/**
 * MenuModule encapsulates all category and menu-item concerns.
 *
 * Dependencies:
 *  - PrismaModule  → provided globally via app.module.ts, no need to import
 *  - RedisModule   → provided globally (@Global), no need to import
 *  - AuthModule    → imported here to make JwtAuthGuard and RolesGuard available
 */
@Module({
  imports: [AuthModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
