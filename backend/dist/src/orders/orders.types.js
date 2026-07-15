"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELIVERY_FEE_CENTS = exports.TAX_RATE = exports.ROLE_ALLOWED_TRANSITIONS = exports.VALID_TRANSITIONS = void 0;
const client_1 = require("@prisma/client");
exports.VALID_TRANSITIONS = {
    [client_1.OrderStatus.PLACED]: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
    [client_1.OrderStatus.CONFIRMED]: [client_1.OrderStatus.PREPARING],
    [client_1.OrderStatus.PREPARING]: [client_1.OrderStatus.READY_FOR_PICKUP],
    [client_1.OrderStatus.READY_FOR_PICKUP]: [client_1.OrderStatus.PICKED_UP],
    [client_1.OrderStatus.PICKED_UP]: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.DELIVERY_FAILED],
    [client_1.OrderStatus.DELIVERED]: [],
    [client_1.OrderStatus.CANCELLED]: [],
    [client_1.OrderStatus.DELIVERY_FAILED]: [],
};
exports.ROLE_ALLOWED_TRANSITIONS = {
    [client_1.Role.CUSTOMER]: [client_1.OrderStatus.CANCELLED],
    [client_1.Role.STAFF]: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
    [client_1.Role.ADMIN]: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
    [client_1.Role.KITCHEN]: [client_1.OrderStatus.PREPARING, client_1.OrderStatus.READY_FOR_PICKUP],
    [client_1.Role.DRIVER]: [client_1.OrderStatus.PICKED_UP, client_1.OrderStatus.DELIVERED, client_1.OrderStatus.DELIVERY_FAILED],
};
exports.TAX_RATE = 0.10;
exports.DELIVERY_FEE_CENTS = 300;
//# sourceMappingURL=orders.types.js.map