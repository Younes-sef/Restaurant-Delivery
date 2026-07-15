import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('DeliveriesController', () => {
  let controller: DeliveriesController;
  let service: DeliveriesService;

  const mockDeliveriesService = {
    getActiveDelivery: jest.fn(),
    updateDeliveryStatus: jest.fn(),
    toggleDriverStatus: jest.fn(),
    assignDriver: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesController],
      providers: [
        {
          provide: DeliveriesService,
          useValue: mockDeliveriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeliveriesController>(DeliveriesController);
    service = module.get<DeliveriesService>(DeliveriesService);
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveDelivery', () => {
    it('should call getActiveDelivery with driverId', async () => {
      const mockReq = { user: { id: 'driver-1' } };
      mockDeliveriesService.getActiveDelivery.mockResolvedValue({ id: 'del-1' });

      const result = await controller.getActiveDelivery(mockReq);

      expect(service.getActiveDelivery).toHaveBeenCalledWith('driver-1');
      expect(result).toEqual({ id: 'del-1' });
    });
  });

  describe('assignDriver', () => {
    it('should call assignDriver', async () => {
      mockDeliveriesService.assignDriver.mockResolvedValue({ id: 'del-1' });

      const result = await controller.assignDriver('order-1', 'driver-1');

      expect(service.assignDriver).toHaveBeenCalledWith('order-1', 'driver-1');
      expect(result).toEqual({ id: 'del-1' });
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should call updateDeliveryStatus', async () => {
      const mockReq = { user: { id: 'driver-1' } };
      mockDeliveriesService.updateDeliveryStatus.mockResolvedValue({ id: 'del-1' });

      const result = await controller.updateDeliveryStatus(mockReq, 'del-1', 'PICKUP');

      expect(service.updateDeliveryStatus).toHaveBeenCalledWith('del-1', 'driver-1', 'PICKUP');
      expect(result).toEqual({ id: 'del-1' });
    });
  });
});
