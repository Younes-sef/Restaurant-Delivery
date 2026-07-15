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
var KitchenGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KitchenGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
let KitchenGateway = KitchenGateway_1 = class KitchenGateway {
    jwtService;
    server;
    logger = new common_1.Logger(KitchenGateway_1.name);
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        try {
            const authHeader = client.handshake.headers.authorization;
            if (!authHeader)
                throw new common_1.UnauthorizedException('Missing Authorization header');
            const token = authHeader.split(' ')[1];
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });
            if (payload.role !== client_1.Role.KITCHEN && payload.role !== client_1.Role.ADMIN) {
                throw new common_1.UnauthorizedException('Forbidden: Requires KITCHEN role');
            }
            client.data.userId = payload.sub;
            this.logger.log(`Kitchen client connected: ${client.id} (User: ${payload.sub})`);
        }
        catch (error) {
            this.logger.warn(`Kitchen client connection rejected: ${error.message}`);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Kitchen client disconnected: ${client.id}`);
    }
    handleOrderStatusChanged(payload) {
        this.logger.log(`Broadcasting order.status.changed (${payload.newStatus}) for Order ${payload.orderId} to Kitchen KDS`);
        this.server.emit('order.updated', payload.order);
    }
};
exports.KitchenGateway = KitchenGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], KitchenGateway.prototype, "server", void 0);
__decorate([
    (0, event_emitter_1.OnEvent)('order.status.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KitchenGateway.prototype, "handleOrderStatusChanged", null);
exports.KitchenGateway = KitchenGateway = KitchenGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/kitchen',
        cors: { origin: '*' },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], KitchenGateway);
//# sourceMappingURL=kitchen.gateway.js.map