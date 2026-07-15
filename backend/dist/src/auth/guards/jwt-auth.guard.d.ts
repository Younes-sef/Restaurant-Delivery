import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
export declare class JwtAuthGuard implements CanActivate {
    private jwtService;
    private redisService;
    constructor(jwtService: JwtService, redisService: RedisService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
