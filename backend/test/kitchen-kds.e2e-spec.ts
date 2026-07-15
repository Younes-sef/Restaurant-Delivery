import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, Role } from '@prisma/client';

describe('Kitchen KDS Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let kitchenSocket: Socket;

  let staffToken: string;
  let kitchenToken: string;
  let testOrderId: string;
  let kitchenUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // 1. Clean Database
    try {
      await prisma.delivery.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (err) {
      console.warn('DB cleanup warning:', err.message);
    }

    // 2. Create Users
    const staff = await prisma.user.create({
      data: {
        firstName: 'Staff',
        lastName: 'Member',
        email: 'staff@test.com',
        passwordHash: 'hashed-password',
        phone: '1234567890',
        role: Role.STAFF,
      },
    });
    staffToken = jwtService.sign({ sub: staff.id, role: Role.STAFF });

    const kitchenUser = await prisma.user.create({
      data: {
        firstName: 'Head',
        lastName: 'Chef',
        email: 'chef@test.com',
        passwordHash: 'hashed-password',
        phone: '0987654321',
        role: Role.KITCHEN,
      },
    });
    kitchenUserId = kitchenUser.id;
    kitchenToken = jwtService.sign({ sub: kitchenUser.id, role: Role.KITCHEN });

    // 3. Create a PLACED Order
    const customer = await prisma.user.create({
      data: {
        firstName: 'Customer',
        lastName: 'Test',
        email: 'customer@test.com',
        passwordHash: 'hashed',
        phone: '1111111111',
        role: Role.CUSTOMER,
      },
    });
    const address = await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        street: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        zipCode: '10001',
      },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        status: OrderStatus.PLACED,
        subtotal: 10,
        tax: 1,
        deliveryFee: 3,
        totalAmount: 14,
        idempotencyKey: 'kitchen-test-idempotency',
      },
    });
    testOrderId = order.id;

    // Start NestJS HTTP server
    await app.listen(0);
  });

  afterAll(async () => {
    if (kitchenSocket) {
      kitchenSocket.disconnect();
    }
    // Cleanup DB
    try {
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (err) {}
    await app.close();
  });

  it('should broadcast order via WebSocket when Staff confirms it', (done) => {
    const httpServer = app.getHttpServer();
    const address = httpServer.address();
    const port = address.port;

    // 1. Connect KDS WebSocket
    kitchenSocket = io(`http://localhost:${port}/kitchen`, {
      extraHeaders: {
        Authorization: `Bearer ${kitchenToken}`,
      },
    });

    kitchenSocket.on('connect', async () => {
      // 2. Staff confirms the order via HTTP
      const res = await request(httpServer)
        .patch(`/api/v1/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: OrderStatus.CONFIRMED });
      
      expect(res.status).toBe(200);
    });

    // 3. KDS listens for 'order.updated' event
    kitchenSocket.on('order.updated', (orderData) => {
      expect(orderData.id).toBe(testOrderId);
      expect(orderData.status).toBe(OrderStatus.CONFIRMED);
      
      // Verification complete
      done();
    });

    kitchenSocket.on('connect_error', (err) => {
      done(err);
    });
  }, 10000); // 10 seconds timeout for WebSocket e2e

  it('should fetch active orders queue for KDS', async () => {
    // We expect the CONFIRMED order to be in the active orders queue
    const res = await request(app.getHttpServer())
      .get('/api/v1/kitchen/orders')
      .set('Authorization', `Bearer ${kitchenToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    
    const activeOrder = res.body.find((o) => o.id === testOrderId);
    expect(activeOrder).toBeDefined();
    expect(activeOrder.status).toBe(OrderStatus.CONFIRMED);
  });
});
