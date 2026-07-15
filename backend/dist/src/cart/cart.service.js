"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CartService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const cart_constants_1 = require("./cart.constants");
const CART_TTL_SECONDS = 60 * 60 * 24 * 7;
let CartService = CartService_1 = class CartService {
    prisma;
    redis;
    logger = new common_1.Logger(CartService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getCart(userId) {
        const raw = await this.redis.hgetAll((0, cart_constants_1.CART_KEY)(userId));
        if (!raw || Object.keys(raw).length === 0) {
            return this.emptyCart();
        }
        const menuItemIds = Object.keys(raw);
        const quantities = raw;
        const menuItems = await this.prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
        });
        const itemMap = new Map(menuItems.map((item) => [item.id, item]));
        const staleItemIds = [];
        const lineItems = [];
        for (const menuItemId of menuItemIds) {
            const item = itemMap.get(menuItemId);
            const quantity = parseInt(quantities[menuItemId], 10);
            if (!item || !item.isAvailable) {
                staleItemIds.push(menuItemId);
                this.logger.warn(`Cart cleanup: item ${menuItemId} is unavailable — removing from cart for user ${userId}`);
                continue;
            }
            const unitPrice = parseFloat(item.price.toString());
            const lineTotal = unitPrice * quantity;
            lineItems.push({
                menuItemId: item.id,
                name: item.name,
                imageUrl: item.imageUrl,
                unitPrice: unitPrice.toFixed(2),
                quantity,
                lineTotal: lineTotal.toFixed(2),
            });
        }
        if (staleItemIds.length > 0) {
            void this.redis.hdel((0, cart_constants_1.CART_KEY)(userId), staleItemIds);
        }
        const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
        return {
            items: lineItems,
            subtotal: subtotal.toFixed(2),
            itemCount: lineItems.reduce((sum, item) => sum + item.quantity, 0),
        };
    }
    async addItem(userId, dto) {
        await this.findAvailableMenuItemOrFail(dto.menuItemId);
        const key = (0, cart_constants_1.CART_KEY)(userId);
        await this.redis.hset(key, dto.menuItemId, String(dto.quantity));
        await this.redis.expire(key, CART_TTL_SECONDS);
        this.logger.debug(`Cart updated: user=${userId} item=${dto.menuItemId} qty=${dto.quantity}`);
        return this.getCart(userId);
    }
    async updateItem(userId, menuItemId, dto) {
        const key = (0, cart_constants_1.CART_KEY)(userId);
        const existing = await this.redis.hget(key, menuItemId);
        if (existing === null) {
            throw new common_1.NotFoundException(`Item ${menuItemId} is not in your cart. Use POST /cart/items to add it.`);
        }
        await this.findAvailableMenuItemOrFail(menuItemId);
        await this.redis.hset(key, menuItemId, String(dto.quantity));
        await this.redis.expire(key, CART_TTL_SECONDS);
        return this.getCart(userId);
    }
    async removeItem(userId, menuItemId) {
        const key = (0, cart_constants_1.CART_KEY)(userId);
        const deleted = await this.redis.hdel(key, [menuItemId]);
        if (deleted === 0) {
            throw new common_1.NotFoundException(`Item ${menuItemId} is not in your cart.`);
        }
        return this.getCart(userId);
    }
    async clearCart(userId) {
        await this.redis.del((0, cart_constants_1.CART_KEY)(userId));
        this.logger.debug(`Cart cleared for user=${userId}`);
    }
    emptyCart() {
        return { items: [], subtotal: '0.00', itemCount: 0 };
    }
    async findAvailableMenuItemOrFail(menuItemId) {
        const item = await this.prisma.menuItem.findUnique({
            where: { id: menuItemId },
            select: { id: true, isAvailable: true },
        });
        if (!item || !item.isAvailable) {
            throw new common_1.NotFoundException(`Menu item "${menuItemId}" does not exist or is no longer available.`);
        }
        return item;
    }
};
exports.CartService = CartService;
exports.CartService = CartService = CartService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], CartService);
//# sourceMappingURL=cart.service.js.map