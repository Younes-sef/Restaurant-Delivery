import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Login endpoint.
   *
   * Security measures applied:
   *  - Strict rate limit: 3 attempts per 60 seconds (brute-force protection).
   *  - JWT delivered as an HttpOnly, SameSite=Strict cookie (XSS + CSRF protection).
   *
   * Mobile / API clients that cannot read cookies can still use the token returned
   * in the response body and pass it as `Authorization: Bearer <token>`.
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const token = await this.authService.login(dto.email, dto.password);

    // Set the JWT as a secure, HttpOnly cookie.
    // HttpOnly  → JavaScript cannot read this cookie (XSS protection).
    // SameSite  → Cookie is not sent with cross-site requests (CSRF protection).
    // Secure    → Cookie is only sent over HTTPS (disabled in dev for convenience).
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (matches JWT expiry)
    });

    return {
      message: 'Login successful',
      // Also expose the token in the body so mobile/API clients can use Bearer auth
      access_token: token,
    };
  }

  /**
   * Logout endpoint.
   *
   * 1. Extracts the raw JWT that JwtAuthGuard already validated (attached to req['token']).
   * 2. Adds it to the Redis blocklist so it cannot be re-used even if someone has copied it.
   * 3. Clears the HttpOnly cookie on the client side.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request & { token?: string }, @Res({ passthrough: true }) res: Response) {
    const token = req.token;
    if (token) {
      await this.authService.logout(token);
    }

    // Clear the cookie regardless of whether the token was in Redis
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict' });

    return { message: 'Logout successful' };
  }

  /**
   * Returns the current user's profile data.
   * Works with both cookie-based (web) and Bearer token (mobile/API) authentication.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request & { user?: any }) {
    // req.user is populated by JwtAuthGuard after token verification
    return req.user;
  }
}
