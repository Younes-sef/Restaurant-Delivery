import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { CartResponse } from './cart.types';
export declare class CartService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    getCart(userId: string): Promise<CartResponse>;
    addItem(userId: string, dto: AddCartItemDto): Promise<CartResponse>;
    updateItem(userId: string, menuItemId: string, dto: UpdateCartItemDto): Promise<CartResponse>;
    removeItem(userId: string, menuItemId: string): Promise<CartResponse>;
    clearCart(userId: string): Promise<void>;
    private emptyCart;
    private findAvailableMenuItemOrFail;
}
