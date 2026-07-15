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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const client_1 = require("@prisma/client");
const cart_constants_1 = require("../cart/cart.constants");
const orders_types_1 = require("./orders.types");
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    redis;
    eventEmitter;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(prisma, redis, eventEmitter) {
        this.prisma = prisma;
        this.redis = redis;
        this.eventEmitter = eventEmitter;
    }
    async createOrder(userId, dto) {
        const order = await this.prisma.$transaction(async (tx) => {
            const existingOrder = await tx.order.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existingOrder) {
                throw new common_1.ConflictException('An order with this idempotency key already exists.');
            }
            const address = await tx.address.findUnique({
                where: { id: dto.addressId },
            });
            if (!address) {
                throw new common_1.NotFoundException(`Address "${dto.addressId}" not found`);
            }
            if (address.userId !== userId) {
                throw new common_1.ForbiddenException('The provided address does not belong to you.');
            }
            const rawCart = await this.redis.hgetAll((0, cart_constants_1.CART_KEY)(userId));
            if (!rawCart || Object.keys(rawCart).length === 0) {
                throw new common_1.BadRequestException('Your cart is empty. Add items before placing an order.');
            }
            const menuItemIds = Object.keys(rawCart);
            const menuItems = await tx.menuItem.findMany({
                where: { id: { in: menuItemIds }, isAvailable: true },
                select: { id: true, name: true, price: true },
            });
            if (menuItems.length !== menuItemIds.length) {
                const foundIds = new Set(menuItems.map((m) => m.id));
                const missingIds = menuItemIds.filter((id) => !foundIds.has(id));
                throw new common_1.BadRequestException(`The following items are no longer available: ${missingIds.join(', ')}. ` +
                    'Please update your cart and try again.');
            }
            const itemMap = new Map(menuItems.map((item) => [item.id, item]));
            let subtotalCents = 0;
            const orderItemsData = menuItemIds.map((menuItemId) => {
                const item = itemMap.get(menuItemId);
                const quantity = parseInt(rawCart[menuItemId], 10);
                const priceCents = Math.round(parseFloat(item.price.toString()) * 100);
                subtotalCents += priceCents * quantity;
                return {
                    quantity,
                    unitPrice: item.price,
                    itemName: item.name,
                    menuItemId: item.id,
                };
            });
            const taxCents = Math.round(subtotalCents * orders_types_1.TAX_RATE);
            const totalCents = subtotalCents + taxCents + orders_types_1.DELIVERY_FEE_CENTS;
            const created = await tx.order.create({
                data: {
                    idempotencyKey: dto.idempotencyKey,
                    customerId: userId,
                    addressId: dto.addressId,
                    subtotal: (subtotalCents / 100).toFixed(2),
                    tax: (taxCents / 100).toFixed(2),
                    deliveryFee: (orders_types_1.DELIVERY_FEE_CENTS / 100).toFixed(2),
                    totalAmount: (totalCents / 100).toFixed(2),
                    items: { create: orderItemsData },
                },
                include: {
                    items: true,
                    address: { select: { label: true, street: true, city: true } },
                },
            });
            this.logger.log(`Order created: id=${created.id} customer=${userId} total=${created.totalAmount}`);
            return created;
        });
        this.redis.del((0, cart_constants_1.CART_KEY)(userId)).catch((err) => this.logger.error(`Failed to clear cart for user=${userId} after order creation`, err));
        return order;
    }
    async getMyOrders(userId) {
        return this.prisma.order.findMany({
            where: { customerId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: { select: { itemName: true, quantity: true, unitPrice: true } },
                address: { select: { label: true, street: true, city: true } },
            },
        });
    }
    async getAllOrders() {
        return this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: { select: { itemName: true, quantity: true, unitPrice: true } },
                address: { select: { label: true, street: true, city: true } },
                customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
        });
    }
    async getOrderById(userId, userRole, orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                address: true,
                customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order "${orderId}" not found`);
        }
        if (userRole === client_1.Role.CUSTOMER && order.customerId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this order');
        }
        return order;
    }
    async updateOrderStatus(userId, userRole, orderId, newStatus, prepTimeEstimate) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order) {
                throw new common_1.NotFoundException(`Order "${orderId}" not found`);
            }
            if (userRole === client_1.Role.CUSTOMER && order.customerId !== userId) {
                throw new common_1.ForbiddenException('You do not have access to this order');
            }
            const allowedForRole = orders_types_1.ROLE_ALLOWED_TRANSITIONS[userRole] ?? [];
            if (!allowedForRole.includes(newStatus)) {
                throw new common_1.ForbiddenException(`Your role (${userRole}) is not permitted to set order status to "${newStatus}".`);
            }
            const validNextStatuses = orders_types_1.VALID_TRANSITIONS[order.status];
            if (!validNextStatuses.includes(newStatus)) {
                throw new common_1.BadRequestException(`Invalid transition: cannot move order from "${order.status}" to "${newStatus}". ` +
                    `Allowed next statuses: [${validNextStatuses.join(', ') || 'none — terminal state'}]`);
            }
            const result = await tx.order.updateMany({
                where: { id: orderId, status: order.status },
                data: {
                    status: newStatus,
                    ...(prepTimeEstimate !== undefined && { prepTimeEstimate }),
                },
            });
            if (result.count === 0) {
                throw new common_1.ConflictException('The order status was changed by another operation simultaneously. ' +
                    'Please refresh and try again.');
            }
            this.logger.log(`Order ${orderId} transitioned: ${order.status} → ${newStatus} by user=${userId} role=${userRole}`);
            const updatedOrder = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    items: true,
                    address: { select: { label: true, street: true, city: true } },
                },
            });
            this.eventEmitter.emit('order.status.changed', {
                orderId,
                oldStatus: order.status,
                newStatus,
                order: updatedOrder,
            });
            return updatedOrder;
        });
    }
    async handleDeliveryStatusChanged(payload) {
        this.logger.log(`Received delivery.status.changed event for Order ${payload.orderId}. Updating to ${payload.newStatus}...`);
        try {
            const existing = await this.prisma.order.findUnique({ where: { id: payload.orderId } });
            this.logger.log(`DEBUG DB CHECK: Order exists? ${!!existing}`);
            await this.prisma.order.update({
                where: { id: payload.orderId },
                data: { status: payload.newStatus },
            });
            this.logger.log(`Successfully synced Order ${payload.orderId} status to ${payload.newStatus}`);
        }
        catch (error) {
            this.logger.error(`Failed to sync Order ${payload.orderId} status to ${payload.newStatus}`, error);
        }
    }
};
exports.OrdersService = OrdersService;
__decorate([
    (0, event_emitter_1.OnEvent)('delivery.status.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersService.prototype, "handleDeliveryStatusChanged", null);
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        event_emitter_1.EventEmitter2])
], OrdersService);
//# sourceMappingURL=orders.service.js.map