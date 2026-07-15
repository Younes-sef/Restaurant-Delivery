import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) { }

  async register(data: RegisterDto) {
    const { password, ...rest } = data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      ...rest,
      passwordHash: hashedPassword,
    });

    // Never expose the password hash to the client
    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * Validates credentials and returns the signed JWT string.
   * The controller is responsible for setting it as an HttpOnly cookie.
   */
  async login(email: string, pass: string): Promise<string> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Revokes a JWT by adding it to the Redis blocklist with a TTL matching
   * the token's remaining valid lifetime. When the JWT would have naturally
   * expired, Redis automatically deletes the entry — zero memory waste.
   *
   * @param token - Raw JWT string extracted from the cookie or Authorization header
   */
  async logout(token: string): Promise<void> {
    try {
      // Decode without verification — we only need the `exp` claim for TTL calculation.
      // The token has already been verified by JwtAuthGuard before reaching here.
      const decoded = this.jwtService.decode(token) as { exp?: number };
      if (decoded?.exp) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const remainingTtl = decoded.exp - nowSeconds;
        await this.redisService.addToBlocklist(token, remainingTtl);
      }
    } catch {
      // If decoding fails, silently complete — the cookie will be cleared anyway.
    }
  }
}
