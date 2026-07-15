import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DriverStatus, OrderStatus } from '@prisma/client';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  // Mock Prisma Service
  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // Execute the callback immediately and pass the mock client itself as 'tx'
      return await callback(mockPrismaService);
    }),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    delivery: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('assignDriver', () => {
    it('should assign a driver successfully', async () => {
      const driverId = 'driver-1';
      const orderId = 'order-1';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: driverId, role: 'DRIVER', driverStatus: DriverStatus.AVAILABLE });
      mockPrismaService.order.findUnique.mockResolvedValue({ id: orderId, status: OrderStatus.READY_FOR_PICKUP });
      mockPrismaService.delivery.findUnique.mockResolvedValue(null);
      mockPrismaService.delivery.create.mockResolvedValue({ id: 'delivery-1', orderId, driverId, assignedAt: new Date() });

      const result = await service.assignDriver(orderId, driverId);

      expect(mockPrismaService.delivery.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderId, driverId }) }));
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({ where: { id: driverId }, data: { driverStatus: DriverStatus.BUSY } });
      expect(result.id).toBe('delivery-1');
    });

    it('should throw ConflictException if driver is not available', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'driver-1', role: 'DRIVER', driverStatus: DriverStatus.BUSY });
      await expect(service.assignDriver('order-1', 'driver-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if order is not ready', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'driver-1', role: 'DRIVER', driverStatus: DriverStatus.AVAILABLE });
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-1', status: OrderStatus.PLACED });
      await expect(service.assignDriver('order-1', 'driver-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update status to DELIVERED and emit event', async () => {
      const deliveryId = 'delivery-1';
      const driverId = 'driver-1';
      const orderId = 'order-1';

      mockPrismaService.delivery.findUnique.mockResolvedValue({
        id: deliveryId,
        driverId,
        orderId,
        pickedUpAt: new Date(),
        deliveredAt: null,
        failedAt: null,
      });

      mockPrismaService.delivery.update.mockResolvedValue({ id: deliveryId });

      await service.updateDeliveryStatus(deliveryId, driverId, 'DELIVER');

      expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: { deliveredAt: expect.any(Date) },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: driverId },
        data: { driverStatus: DriverStatus.AVAILABLE },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('delivery.status.changed', {
        orderId,
        newStatus: OrderStatus.DELIVERED,
        driverId,
      });
    });

    it('should throw ForbiddenException if driver is not assigned', async () => {
      mockPrismaService.delivery.findUnique.mockResolvedValue({ id: 'del-1', driverId: 'another-driver' });
      await expect(service.updateDeliveryStatus('del-1', 'driver-1', 'PICKUP')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleDriverStatus', () => {
    it('should throw BadRequestException if trying to go offline while busy', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'driver-1', driverStatus: DriverStatus.BUSY });
      await expect(service.toggleDriverStatus('driver-1', false)).rejects.toThrow(BadRequestException);
    });
  });
});
