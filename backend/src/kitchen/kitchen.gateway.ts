import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';

@WebSocketGateway({
  namespace: '/kitchen',
  cors: { origin: '*' },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KitchenGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader) throw new UnauthorizedException('Missing Authorization header');

      const token = authHeader.split(' ')[1];
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload.role !== Role.KITCHEN && payload.role !== Role.ADMIN) {
        throw new UnauthorizedException('Forbidden: Requires KITCHEN role');
      }

      client.data.userId = payload.sub;
      this.logger.log(`Kitchen client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Kitchen client connection rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Kitchen client disconnected: ${client.id}`);
  }

  /**
   * Listen for order status changes.
   * If the order status changes to something the KDS cares about, broadcast it to all connected KDS clients.
   */
  @OnEvent('order.status.changed')
  handleOrderStatusChanged(payload: { orderId: string; oldStatus: string; newStatus: string; order: any }) {
    // We broadcast the updated order. The KDS frontend will replace the existing order in its state or add a new one.
    this.logger.log(`Broadcasting order.status.changed (${payload.newStatus}) for Order ${payload.orderId} to Kitchen KDS`);
    this.server.emit('order.updated', payload.order);
  }
}
