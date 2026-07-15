import { Test, TestingModule } from '@nestjs/testing';
import { KitchenGateway } from './kitchen.gateway';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

describe('KitchenGateway', () => {
  let gateway: KitchenGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<KitchenGateway>(KitchenGateway);
    jwtService = module.get<JwtService>(JwtService);
    
    // Mock the WebSocket server
    gateway.server = {
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect client if no auth header is provided', async () => {
      const mockClient = {
        handshake: { headers: {} },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect client if role is not KITCHEN or ADMIN', async () => {
      const mockClient = {
        handshake: { headers: { authorization: 'Bearer invalid-token' } },
        disconnect: jest.fn(),
        data: {},
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'user-1',
        role: Role.CUSTOMER,
      });

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should allow connection and set userId in client data if role is KITCHEN', async () => {
      const mockClient = {
        id: 'client-1',
        handshake: { headers: { authorization: 'Bearer valid-token' } },
        disconnect: jest.fn(),
        data: { userId: undefined },
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'chef-1',
        role: Role.KITCHEN,
      });

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).not.toHaveBeenCalled();
      expect(mockClient.data.userId).toBe('chef-1');
    });
  });

  describe('handleOrderStatusChanged', () => {
    it('should emit order.updated to all connected clients', () => {
      const payload = {
        orderId: 'order-1',
        oldStatus: 'PLACED',
        newStatus: 'CONFIRMED',
        order: { id: 'order-1', status: 'CONFIRMED' },
      };

      gateway.handleOrderStatusChanged(payload);

      expect(gateway.server.emit).toHaveBeenCalledWith('order.updated', payload.order);
    });
  });
});
