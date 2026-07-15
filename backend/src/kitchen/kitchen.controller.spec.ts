import { Test, TestingModule } from '@nestjs/testing';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('KitchenController', () => {
  let controller: KitchenController;
  let service: KitchenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenController],
      providers: [
        {
          provide: KitchenService,
          useValue: {
            getActiveOrders: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KitchenController>(KitchenController);
    service = module.get<KitchenService>(KitchenService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveOrders', () => {
    it('should return active orders from the service', async () => {
      const mockOrders = [{ id: '1', items: [] }];
      jest.spyOn(service, 'getActiveOrders').mockResolvedValue(mockOrders as any);

      const result = await controller.getActiveOrders();

      expect(service.getActiveOrders).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
    });
  });
});
