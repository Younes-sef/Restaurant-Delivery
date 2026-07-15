"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeliveriesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveriesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const redis_service_1 = require("../redis/redis.service");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let DeliveriesGateway = DeliveriesGateway_1 = class DeliveriesGateway {
    redisService;
    jwtService;
    server;
    logger = new common_1.Logger(DeliveriesGateway_1.name);
    constructor(redisService, jwtService) {
        this.redisService = redisService;
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                throw new Error('Unauthorized');
            }
            const decoded = this.jwtService.verify(token);
            client.data.driverId = decoded.sub;
            this.logger.log(`Driver connected: ${client.data.driverId} (Socket: ${client.id})`);
        }
        catch (error) {
            this.logger.error(`Connection failed: ${error.message}`);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Driver disconnected: ${client.data.driverId} (Socket: ${client.id})`);
    }
    async handleLocationUpdate(client, payload) {
        const driverId = client.data.driverId;
        if (!driverId || !payload.latitude || !payload.longitude) {
            return;
        }
        try {
            await this.redisService.geoadd('driver_locations', payload.longitude, payload.latitude, driverId);
        }
        catch (error) {
            this.logger.error(`Failed to update location for driver ${driverId}`, error);
        }
    }
};
exports.DeliveriesGateway = DeliveriesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DeliveriesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver.location.update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], DeliveriesGateway.prototype, "handleLocationUpdate", null);
exports.DeliveriesGateway = DeliveriesGateway = DeliveriesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/driver-tracking',
    }),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        jwt_1.JwtService])
], DeliveriesGateway);
//# sourceMappingURL=deliveries.gateway.js.map