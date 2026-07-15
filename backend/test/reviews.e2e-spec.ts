import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrderStatus, Role } from '@prisma/client';

describe('Reviews Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let customer1Token: string;
  let customer2Token: string;
  let order1Id: string;
  let order2Id: string;

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
      await prisma.review.deleteMany();
      await prisma.delivery.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (err) {
      console.warn('DB cleanup warning:', err.message);
    }

    // 2. Create Users
    const customer1 = await prisma.user.create({
      data: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@test.com',
        passwordHash: 'hashed',
        role: Role.CUSTOMER,
      },
    });
    customer1Token = jwtService.sign({ sub: customer1.id, role: Role.CUSTOMER });

    const customer2 = await prisma.user.create({
      data: {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@test.com',
        passwordHash: 'hashed',
        role: Role.CUSTOMER,
      },
    });
    customer2Token = jwtService.sign({ sub: customer2.id, role: Role.CUSTOMER });

    // 3. Create Addresses and Orders
    const address1 = await prisma.address.create({
      data: { userId: customer1.id, label: 'Home', street: '1', city: 'A', state: 'A', zipCode: '1' },
    });

    const order1 = await prisma.order.create({
      data: {
        customerId: customer1.id,
        addressId: address1.id,
        status: OrderStatus.PREPARING,
        subtotal: 10, tax: 1, deliveryFee: 3, totalAmount: 14,
        idempotencyKey: 'review-e2e-order1',
      },
    });
    order1Id = order1.id;

    const order2 = await prisma.order.create({
      data: {
        customerId: customer2.id,
        addressId: address1.id, // Just reuse
        status: OrderStatus.DELIVERED,
        subtotal: 10, tax: 1, deliveryFee: 3, totalAmount: 14,
        idempotencyKey: 'review-e2e-order2',
      },
    });
    order2Id = order2.id;
  });

  afterAll(async () => {
    try {
      await prisma.review.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
    } catch (err) {}
    await app.close();
  });

  it('should prevent customer from reviewing an order they do not own', async () => {
    // customer1 tries to review order2 (which belongs to customer2)
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order2Id}/reviews`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  it('should prevent reviewing an order that is not DELIVERED', async () => {
    // customer1 tries to review order1 (which is PREPARING)
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order1Id}/reviews`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ rating: 4, comment: 'Too slow' });

    expect(res.status).toBe(400);
  });

  it('should successfully create a review for a DELIVERED order', async () => {
    // customer2 reviews order2 (DELIVERED)
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order2Id}/reviews`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ rating: 5, comment: 'Amazing food!' });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe('Amazing food!');
  });

  it('should prevent duplicate reviews (P2002 conflict)', async () => {
    // customer2 tries to review order2 again
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${order2Id}/reviews`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ rating: 1 });

    expect(res.status).toBe(409);
  });

  it('should fetch recent reviews with masked PII', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reviews/recent')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    
    const review = res.body.find(r => r.orderId === order2Id);
    expect(review.rating).toBe(5);
    // PII Check
    expect(review.customer.firstName).toBe('Bob');
    expect(review.customer.lastName).toBe('J.');
  });
});
