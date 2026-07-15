import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
interface LocationUpdatePayload {
    longitude: number;
    latitude: number;
}
export declare class DeliveriesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly redisService;
    private readonly jwtService;
    server: Server;
    private readonly logger;
    constructor(redisService: RedisService, jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleLocationUpdate(client: Socket, payload: LocationUpdatePayload): Promise<void>;
}
export {};
