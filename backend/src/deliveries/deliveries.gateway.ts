import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface LocationUpdatePayload {
  longitude: number;
  latitude: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/driver-tracking',
})
export class DeliveriesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeliveriesGateway.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Very basic auth via query param or headers (for demo purposes we extract token from auth header)
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('Unauthorized');
      }

      const decoded = this.jwtService.verify(token);
      client.data.driverId = decoded.sub; // Storing driverId on socket

      this.logger.log(`Driver connected: ${client.data.driverId} (Socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Driver disconnected: ${client.data.driverId} (Socket: ${client.id})`);
  }

  @SubscribeMessage('driver.location.update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LocationUpdatePayload,
  ) {
    const driverId = client.data.driverId;
    if (!driverId || !payload.latitude || !payload.longitude) {
      return; // Ignore invalid pings
    }

    try {
      // Store driver location in Redis using GEOADD
      // Key: "driver_locations", Longitude, Latitude, Member: driverId
      await this.redisService.geoadd(
        'driver_locations',
        payload.longitude,
        payload.latitude,
        driverId,
      );

      // Optionally, set an expiry or cleanup old drivers that haven't pinged in a while
      // but GEOADD adds to a sorted set, so cleanup would need to be a scheduled job

      // this.logger.debug(`Location updated for driver ${driverId}: [${payload.longitude}, ${payload.latitude}]`);
    } catch (error) {
      this.logger.error(`Failed to update location for driver ${driverId}`, error);
    }
  }
}
