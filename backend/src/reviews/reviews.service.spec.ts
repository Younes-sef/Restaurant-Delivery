import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
            },
            review: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);
      await expect(service.createReview('user-1', 'order-1', { rating: 5 })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another customer', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({ customerId: 'user-2' } as any);
      await expect(service.createReview('user-1', 'order-1', { rating: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is not DELIVERED', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({ 
        customerId: 'user-1', 
        status: OrderStatus.PREPARING 
      } as any);
      
      await expect(service.createReview('user-1', 'order-1', { rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should create review successfully for DELIVERED order', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({ 
        customerId: 'user-1', 
        status: OrderStatus.DELIVERED 
      } as any);
      
      const reviewData = { rating: 5, comment: 'Great!' };
      jest.spyOn(prisma.review, 'create').mockResolvedValue({ id: 'rev-1', ...reviewData } as any);

      const result = await service.createReview('user-1', 'order-1', reviewData);
      expect(result.id).toBe('rev-1');
      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          customerId: 'user-1',
          rating: 5,
          comment: 'Great!',
        },
      });
    });

    it('should throw ConflictException if P2002 constraint occurs', async () => {
      jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({ 
        customerId: 'user-1', 
        status: OrderStatus.DELIVERED 
      } as any);
      
      jest.spyOn(prisma.review, 'create').mockRejectedValue({ code: 'P2002' });

      await expect(service.createReview('user-1', 'order-1', { rating: 5 })).rejects.toThrow(ConflictException);
    });
  });

  describe('getRecentReviews', () => {
    it('should fetch reviews and mask PII', async () => {
      jest.spyOn(prisma.review, 'findMany').mockResolvedValue([
        {
          id: 'rev-1',
          rating: 5,
          customer: { firstName: 'John', lastName: 'Doe' },
        } as any,
      ]);

      const result = await service.getRecentReviews();
      expect(result[0].customer.firstName).toBe('John');
      expect(result[0].customer.lastName).toBe('D.');
    });

    it('should apply minRating filter if provided', async () => {
      jest.spyOn(prisma.review, 'findMany').mockResolvedValue([]);
      await service.getRecentReviews(4);

      expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { rating: { gte: 4 } },
      }));
    });
  });
});
