import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, Role, DriverStatus } from '@prisma/client';

describe('Event Bus Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let jwtService: JwtService;

  let testDriverToken: string;
  let testDriverId: string;
  let testOrderId: string;
  let testDeliveryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    redis = app.get<RedisService>(RedisService);
    jwtService = app.get<JwtService>(JwtService);

    try {
      await prisma.delivery.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (error) {
      console.error('PRISMA ERROR CODE:', error.code);
      console.error('PRISMA ERROR META:', error.meta);
      console.error('PRISMA ERROR MESSAGE:', error.message);
      throw error;
    }

    // Setup Test Data
    const customer = await prisma.user.create({
      data: {
        email: 'customer.e2e@test.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'Customer',
        role: Role.CUSTOMER,
      },
    });

    const driver = await prisma.user.create({
      data: {
        email: 'driver.e2e@test.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'Driver',
        role: Role.DRIVER,
        driverStatus: DriverStatus.BUSY, // assigned to delivery below
      },
    });
    testDriverId = driver.id;
    testDriverToken = jwtService.sign({ sub: driver.id, role: Role.DRIVER });

    const address = await prisma.address.create({
      data: {
        label: 'Home',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        userId: customer.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        status: OrderStatus.PICKED_UP,
        subtotal: 10,
        tax: 1,
        deliveryFee: 3,
        totalAmount: 14,
        idempotencyKey: 'test-e2e-idempotency',
      },
    });
    testOrderId = order.id;

    const delivery = await prisma.delivery.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        assignedAt: new Date(),
        pickedUpAt: new Date(),
      },
    });
    testDeliveryId = delivery.id;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await prisma.delivery.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (e) {}
    await app.close();
  });

  it('should decouple delivery status update from order status update via Event Bus', async () => {
    // 1. Send PATCH to Deliveries module to mark as DELIVERED
    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/driver/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${testDriverToken}`)
      .send({ action: 'DELIVER' })
      .expect(200);

    // 2. Poll the DB until the event listener processes the update
    let updatedOrder = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      if (updatedOrder && updatedOrder.status === OrderStatus.DELIVERED) {
        break;
      }
    }

    expect(updatedOrder.status).toBe(OrderStatus.DELIVERED);

    const updatedDriver = await prisma.user.findUnique({
      where: { id: testDriverId },
    });
    expect(updatedDriver.driverStatus).toBe(DriverStatus.AVAILABLE);
  });
});
