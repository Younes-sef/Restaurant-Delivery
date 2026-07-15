import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesGateway } from './deliveries.gateway';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

describe('DeliveriesGateway', () => {
  let gateway: DeliveriesGateway;
  let redisService: RedisService;
  let jwtService: JwtService;

  const mockRedisService = {
    geoadd: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesGateway,
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<DeliveriesGateway>(DeliveriesGateway);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate driver and store ID in socket data', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'valid-token' } },
        data: {},
        id: 'socket-1',
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockJwtService.verify.mockReturnValue({ sub: 'driver-1' });

      await gateway.handleConnection(mockSocket);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockSocket.data.driverId).toBe('driver-1');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect if token is invalid', async () => {
      const mockSocket = {
        handshake: { auth: { token: 'invalid-token' } },
        data: {},
        id: 'socket-1',
        disconnect: jest.fn(),
      } as unknown as Socket;

      mockJwtService.verify.mockImplementation(() => { throw new Error('Invalid'); });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleLocationUpdate', () => {
    it('should store location in Redis', async () => {
      const mockSocket = {
        data: { driverId: 'driver-1' },
      } as unknown as Socket;

      const payload = { longitude: -122.4194, latitude: 37.7749 };

      await gateway.handleLocationUpdate(mockSocket, payload);

      expect(mockRedisService.geoadd).toHaveBeenCalledWith(
        'driver_locations',
        payload.longitude,
        payload.latitude,
        'driver-1',
      );
    });

    it('should ignore if driverId or coordinates are missing', async () => {
      const mockSocket = { data: {} } as unknown as Socket;
      await gateway.handleLocationUpdate(mockSocket, { longitude: 1, latitude: 1 });
      expect(mockRedisService.geoadd).not.toHaveBeenCalled();
    });
  });
});
