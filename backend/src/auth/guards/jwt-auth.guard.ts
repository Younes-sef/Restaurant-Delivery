import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import type { Request } from 'express';

/**
 * JwtAuthGuard — Production-grade JWT authentication guard.
 *
 * Token extraction strategy (dual-source, priority order):
 *  1. HttpOnly cookie `access_token`  → for web browser clients
 *  2. `Authorization: Bearer <token>` → for mobile apps / API clients
 *
 * After cryptographic verification the guard also consults the Redis blocklist,
 * rejecting any token that has been explicitly revoked via the logout endpoint.
 *
 * Attaches to the request object:
 *  - `req['user']`  → decoded JWT payload (sub, email, role, iat, exp)
 *  - `req['token']` → raw JWT string (used by the logout controller)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & Record<string, any>>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // --- Step 1: Cryptographic verification ---
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // --- Step 2: Redis blocklist check (logout revocation) ---
    const isRevoked = await this.redisService.isBlocklisted(token);
    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // --- Step 3: Attach context to the request ---
    request['user'] = payload;   // Available as req.user in controllers
    request['token'] = token;    // Raw token needed by the logout endpoint

    return true;
  }

  /**
   * Attempts to extract the JWT from two sources in priority order:
   *  1. HttpOnly cookie (web clients)
   *  2. Authorization: Bearer header (mobile / API clients)
   */
  private extractToken(request: Request): string | undefined {
    // Priority 1: HttpOnly cookie (set by the login endpoint)
    const cookies = (request as any).cookies as Record<string, string> | undefined;
    const cookieToken = cookies?.['access_token'];
    if (cookieToken) {
      return cookieToken;
    }

    // Priority 2: Authorization: Bearer <token> header (fallback for mobile/API)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return undefined;
  }
}
