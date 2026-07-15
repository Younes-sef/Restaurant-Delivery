import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * RedisService wraps an ioredis client and provides two focused methods
 * for the JWT blocklist (logout / revocation) feature.
 *
 * The client is connected lazily on first use and gracefully closed when
 * the NestJS application shuts down.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      // Retry strategy: give up after 3 attempts so a missing Redis in dev
      // doesn't crash the whole application.
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Add a JWT to the blocklist.
   * The key expires automatically after `ttlSeconds`, keeping memory lean.
   * Uses the raw token string as the key to make lookups O(1).
   *
   * @param token      - Raw JWT string to revoke
   * @param ttlSeconds - Remaining lifetime of the token in seconds
   */
  async addToBlocklist(token: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return; // Token already expired — nothing to store
    // EX sets key expiry in seconds. Value is a placeholder.
    await this.client.set(`blocklist:${token}`, '1', 'EX', ttlSeconds);
  }

  // ---------------------------------------------------------------------------
  // Generic Cache Helpers
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a cached value by key.
   * Returns `null` when the key does not exist or has expired.
   *
   * @param key - Redis key to look up
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Store a value in Redis with an optional TTL.
   *
   * @param key        - Redis key
   * @param value      - String value to store (JSON.stringify before passing)
   * @param ttlSeconds - Optional expiry in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete one or more keys from Redis.
   * Silently succeeds if the key does not exist.
   *
   * @param key - Redis key to remove
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // ---------------------------------------------------------------------------
  // Redis Hash Helpers (used by CartService)
  // ---------------------------------------------------------------------------

  /**
   * Set a single field in a Redis Hash.
   *
   * @param key   - Hash key (e.g. `cart:{userId}`)
   * @param field - Hash field (e.g. `menuItemId`)
   * @param value - Value to store (always a string)
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  /**
   * Get a single field from a Redis Hash.
   * Returns `null` when the key or field does not exist.
   *
   * @param key   - Hash key
   * @param field - Hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  /**
   * Get all fields and values from a Redis Hash.
   * Returns an empty object `{}` when the key does not exist.
   *
   * @param key - Hash key
   */
  async hgetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key) as Promise<Record<string, string>>;
  }

  /**
   * Delete one or more fields from a Redis Hash.
   * Returns the number of fields that were removed.
   *
   * @param key    - Hash key
   * @param fields - One or more field names to delete
   */
  async hdel(key: string, fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  /**
   * Set or update the TTL (time-to-live) on an existing key.
   * Used to "refresh" the cart expiry on every write.
   *
   * @param key        - Redis key
   * @param ttlSeconds - Expiry in seconds
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // ---------------------------------------------------------------------------
  // JWT Blocklist Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether a JWT is on the blocklist (i.e., the user has logged out).
   *
   * @param token - Raw JWT string to check
   * @returns     `true` if the token has been revoked, `false` otherwise
   */
  async isBlocklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`blocklist:${token}`);
    return result !== null;
  }

  // ---------------------------------------------------------------------------
  // Geo / Location Helpers
  // ---------------------------------------------------------------------------

  /**
   * Add a geospatial location to a key
   * 
   * @param key       - Redis key
   * @param longitude - Longitude
   * @param latitude  - Latitude
   * @param member    - The member identifier (e.g., driverId)
   */
  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<void> {
    await this.client.geoadd(key, longitude, latitude, member);
  }
}
