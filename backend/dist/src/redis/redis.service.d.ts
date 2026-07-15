import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    addToBlocklist(token: string, ttlSeconds: number): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    hset(key: string, field: string, value: string): Promise<void>;
    hget(key: string, field: string): Promise<string | null>;
    hgetAll(key: string): Promise<Record<string, string>>;
    hdel(key: string, fields: string[]): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    isBlocklisted(token: string): Promise<boolean>;
    geoadd(key: string, longitude: number, latitude: number, member: string): Promise<void>;
}
