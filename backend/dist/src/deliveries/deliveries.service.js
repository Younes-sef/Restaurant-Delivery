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
var DeliveriesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let DeliveriesService = DeliveriesService_1 = class DeliveriesService {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(DeliveriesService_1.name);
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async assignDriver(orderId, driverId) {
        return this.prisma.$transaction(async (tx) => {
            const driver = await tx.user.findUnique({ where: { id: driverId } });
            if (!driver)
                throw new common_1.NotFoundException('Driver not found');
            if (driver.role !== 'DRIVER')
                throw new common_1.BadRequestException('User is not a driver');
            if (driver.driverStatus !== client_1.DriverStatus.AVAILABLE) {
                throw new common_1.ConflictException(`Driver is currently ${driver.driverStatus}`);
            }
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.READY_FOR_PICKUP && order.status !== client_1.OrderStatus.PREPARING) {
                throw new common_1.BadRequestException('Order must be PREPARING or READY_FOR_PICKUP to assign a driver');
            }
            const existingDelivery = await tx.delivery.findUnique({ where: { orderId } });
            if (existingDelivery) {
                throw new common_1.ConflictException('Order already has an assigned delivery');
            }
            const delivery = await tx.delivery.create({
                data: {
                    orderId,
                    driverId,
                    assignedAt: new Date(),
                },
            });
            await tx.user.update({
                where: { id: driverId },
                data: { driverStatus: client_1.DriverStatus.BUSY },
            });
            this.logger.log(`Driver ${driverId} assigned to Order ${orderId}`);
            return delivery;
        });
    }
    async toggleDriverStatus(driverId, isOnline) {
        const status = isOnline ? client_1.DriverStatus.AVAILABLE : client_1.DriverStatus.OFFLINE;
        const user = await this.prisma.user.findUnique({ where: { id: driverId } });
        if (!user)
            throw new common_1.NotFoundException('Driver not found');
        if (!isOnline && user.driverStatus === client_1.DriverStatus.BUSY) {
            throw new common_1.BadRequestException('Cannot go offline while on an active delivery');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: driverId },
            data: { driverStatus: status },
            select: { id: true, firstName: true, driverStatus: true },
        });
        this.logger.log(`Driver ${driverId} status changed to ${status}`);
        return updatedUser;
    }
    async getActiveDelivery(driverId) {
        const delivery = await this.prisma.delivery.findFirst({
            where: {
                driverId,
                deliveredAt: null,
                failedAt: null,
            },
            include: {
                order: {
                    include: {
                        address: true,
                    }
                },
            },
        });
        if (!delivery) {
            throw new common_1.NotFoundException('No active delivery found');
        }
        return delivery;
    }
    async updateDeliveryStatus(deliveryId, driverId, action) {
        return this.prisma.$transaction(async (tx) => {
            const delivery = await tx.delivery.findUnique({
                where: { id: deliveryId },
                include: { order: true },
            });
            if (!delivery) {
                throw new common_1.NotFoundException('Delivery not found');
            }
            if (delivery.driverId !== driverId) {
                throw new common_1.ForbiddenException('You are not assigned to this delivery');
            }
            if (delivery.deliveredAt || delivery.failedAt) {
                throw new common_1.BadRequestException('This delivery is already completed or failed');
            }
            let newOrderStatus;
            const updateData = {};
            if (action === 'PICKUP') {
                if (delivery.pickedUpAt) {
                    throw new common_1.BadRequestException('Delivery is already picked up');
                }
                updateData.pickedUpAt = new Date();
                newOrderStatus = client_1.OrderStatus.PICKED_UP;
            }
            else if (action === 'DELIVER') {
                if (!delivery.pickedUpAt) {
                    throw new common_1.BadRequestException('Delivery must be picked up before it can be delivered');
                }
                updateData.deliveredAt = new Date();
                newOrderStatus = client_1.OrderStatus.DELIVERED;
            }
            else if (action === 'FAIL') {
                updateData.failedAt = new Date();
                newOrderStatus = client_1.OrderStatus.DELIVERY_FAILED;
            }
            else {
                throw new common_1.BadRequestException('Invalid action');
            }
            const updatedDelivery = await tx.delivery.update({
                where: { id: deliveryId },
                data: updateData,
            });
            if (action === 'DELIVER' || action === 'FAIL') {
                await tx.user.update({
                    where: { id: driverId },
                    data: { driverStatus: client_1.DriverStatus.AVAILABLE },
                });
            }
            this.eventEmitter.emit('delivery.status.changed', {
                orderId: delivery.orderId,
                newStatus: newOrderStatus,
                driverId,
            });
            this.logger.log(`Delivery ${deliveryId} status updated by driver ${driverId} with action ${action}`);
            return updatedDelivery;
        });
    }
};
exports.DeliveriesService = DeliveriesService;
exports.DeliveriesService = DeliveriesService = DeliveriesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], DeliveriesService);
//# sourceMappingURL=deliveries.service.js.map