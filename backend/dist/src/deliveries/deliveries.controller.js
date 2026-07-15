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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveriesController = void 0;
const common_1 = require("@nestjs/common");
const deliveries_service_1 = require("./deliveries.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let DeliveriesController = class DeliveriesController {
    deliveriesService;
    constructor(deliveriesService) {
        this.deliveriesService = deliveriesService;
    }
    async getActiveDelivery(req) {
        const driverId = req.user.sub;
        return this.deliveriesService.getActiveDelivery(driverId);
    }
    async updateDeliveryStatus(req, deliveryId, action) {
        const driverId = req.user.sub;
        return this.deliveriesService.updateDeliveryStatus(deliveryId, driverId, action);
    }
    async toggleStatus(req, isOnline) {
        const driverId = req.user.sub;
        return this.deliveriesService.toggleDriverStatus(driverId, isOnline);
    }
    async assignDriver(orderId, driverId) {
        return this.deliveriesService.assignDriver(orderId, driverId);
    }
};
exports.DeliveriesController = DeliveriesController;
__decorate([
    (0, common_1.Get)('driver/active'),
    (0, roles_decorator_1.Roles)(client_1.Role.DRIVER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "getActiveDelivery", null);
__decorate([
    (0, common_1.Patch)('driver/:id/status'),
    (0, roles_decorator_1.Roles)(client_1.Role.DRIVER),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "updateDeliveryStatus", null);
__decorate([
    (0, common_1.Patch)('status'),
    (0, roles_decorator_1.Roles)(client_1.Role.DRIVER),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('isOnline')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Post)('staff/orders/:orderId/assign-driver'),
    (0, roles_decorator_1.Roles)(client_1.Role.STAFF, client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)('driverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DeliveriesController.prototype, "assignDriver", null);
exports.DeliveriesController = DeliveriesController = __decorate([
    (0, common_1.Controller)('api/v1/deliveries'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [deliveries_service_1.DeliveriesService])
], DeliveriesController);
//# sourceMappingURL=deliveries.controller.js.map