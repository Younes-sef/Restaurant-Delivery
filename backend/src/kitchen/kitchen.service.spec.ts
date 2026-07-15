import { Test, TestingModule } from '@nestjs/testing';
import { KitchenService } from './kitchen.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('KitchenService', () => {
  let service: KitchenService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<KitchenService>(KitchenService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveOrders', () => {
    it('should query orders in CONFIRMED, PREPARING, and READY_FOR_PICKUP statuses', async () => {
      const mockOrders = [
        { id: '1', status: OrderStatus.CONFIRMED },
        { id: '2', status: OrderStatus.PREPARING },
      ];
      jest.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);

      const result = await service.getActiveOrders();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.READY_FOR_PICKUP,
            ],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          items: true,
        },
      });
      expect(result).toEqual(mockOrders);
    });
  });
});
