import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DriverStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Assign a driver to an order (Staff action)
   */
  async assignDriver(orderId: string, driverId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Check if driver is available
      const driver = await tx.user.findUnique({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver not found');
      if (driver.role !== 'DRIVER') throw new BadRequestException('User is not a driver');
      if (driver.driverStatus !== DriverStatus.AVAILABLE) {
        throw new ConflictException(`Driver is currently ${driver.driverStatus}`);
      }

      // Check if order exists and is ready for pickup or preparing
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.READY_FOR_PICKUP && order.status !== OrderStatus.PREPARING) {
        throw new BadRequestException('Order must be PREPARING or READY_FOR_PICKUP to assign a driver');
      }

      // Check if order already has an active delivery
      const existingDelivery = await tx.delivery.findUnique({ where: { orderId } });
      if (existingDelivery) {
        throw new ConflictException('Order already has an assigned delivery');
      }

      // Create delivery record
      const delivery = await tx.delivery.create({
        data: {
          orderId,
          driverId,
          assignedAt: new Date(),
        },
      });

      // Update driver status to BUSY
      await tx.user.update({
        where: { id: driverId },
        data: { driverStatus: DriverStatus.BUSY },
      });

      this.logger.log(`Driver ${driverId} assigned to Order ${orderId}`);

      // We could emit a websocket event to the driver here to notify them!
      return delivery;
    });
  }

  /**
   * Toggle Driver Status between ONLINE and OFFLINE
   */
  async toggleDriverStatus(driverId: string, isOnline: boolean) {
    const status = isOnline ? DriverStatus.AVAILABLE : DriverStatus.OFFLINE;
    
    // Ensure the driver is not BUSY before going offline
    const user = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!user) throw new NotFoundException('Driver not found');
    if (!isOnline && user.driverStatus === DriverStatus.BUSY) {
      throw new BadRequestException('Cannot go offline while on an active delivery');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: driverId },
      data: { driverStatus: status },
      select: { id: true, firstName: true, driverStatus: true },
    });
    
    this.logger.log(`Driver ${driverId} status changed to ${status}`);
    return updatedUser;
  }

  /**
   * Get the current active delivery for a driver
   */
  async getActiveDelivery(driverId: string) {
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
      throw new NotFoundException('No active delivery found');
    }

    return delivery;
  }

  /**
   * Driver updates the status of the delivery
   * action: 'PICKUP', 'DELIVER', 'FAIL'
   */
  async updateDeliveryStatus(deliveryId: string, driverId: string, action: 'PICKUP' | 'DELIVER' | 'FAIL') {
    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { order: true },
      });

      if (!delivery) {
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.driverId !== driverId) {
        throw new ForbiddenException('You are not assigned to this delivery');
      }

      if (delivery.deliveredAt || delivery.failedAt) {
        throw new BadRequestException('This delivery is already completed or failed');
      }

      let newOrderStatus: OrderStatus;
      const updateData: any = {};

      if (action === 'PICKUP') {
        if (delivery.pickedUpAt) {
          throw new BadRequestException('Delivery is already picked up');
        }
        updateData.pickedUpAt = new Date();
        newOrderStatus = OrderStatus.PICKED_UP;
      } else if (action === 'DELIVER') {
        if (!delivery.pickedUpAt) {
          throw new BadRequestException('Delivery must be picked up before it can be delivered');
        }
        updateData.deliveredAt = new Date();
        newOrderStatus = OrderStatus.DELIVERED;
      } else if (action === 'FAIL') {
        updateData.failedAt = new Date();
        newOrderStatus = OrderStatus.DELIVERY_FAILED;
      } else {
        throw new BadRequestException('Invalid action');
      }

      // Update Delivery
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: updateData,
      });

      // Update Driver status to AVAILABLE if completed or failed
      if (action === 'DELIVER' || action === 'FAIL') {
        await tx.user.update({
          where: { id: driverId },
          data: { driverStatus: DriverStatus.AVAILABLE },
        });
      }

      // Emit event for Orders module to react
      this.eventEmitter.emit('delivery.status.changed', {
        orderId: delivery.orderId,
        newStatus: newOrderStatus,
        driverId,
      });

      this.logger.log(`Delivery ${deliveryId} status updated by driver ${driverId} with action ${action}`);

      return updatedDelivery;
    });
  }
}
