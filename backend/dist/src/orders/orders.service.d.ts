import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OrderStatus, Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersService {
    private readonly prisma;
    private readonly redis;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, eventEmitter: EventEmitter2);
    createOrder(userId: string, dto: CreateOrderDto): Promise<{
        address: {
            label: string;
            street: string;
            city: string;
        };
        items: {
            id: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
            menuItemId: string | null;
            orderId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        idempotencyKey: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax: import("@prisma/client-runtime-utils").Decimal;
        deliveryFee: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        prepTimeEstimate: number | null;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        addressId: string;
    }>;
    getMyOrders(userId: string): Promise<({
        address: {
            label: string;
            street: string;
            city: string;
        };
        items: {
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        idempotencyKey: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax: import("@prisma/client-runtime-utils").Decimal;
        deliveryFee: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        prepTimeEstimate: number | null;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        addressId: string;
    })[]>;
    getAllOrders(): Promise<({
        address: {
            label: string;
            street: string;
            city: string;
        };
        customer: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        items: {
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        idempotencyKey: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax: import("@prisma/client-runtime-utils").Decimal;
        deliveryFee: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        prepTimeEstimate: number | null;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        addressId: string;
    })[]>;
    getOrderById(userId: string, userRole: Role, orderId: string): Promise<{
        address: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            label: string;
            street: string;
            city: string;
            state: string;
            zipCode: string;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            userId: string;
        };
        customer: {
            id: string;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        items: {
            id: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
            menuItemId: string | null;
            orderId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        idempotencyKey: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax: import("@prisma/client-runtime-utils").Decimal;
        deliveryFee: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        prepTimeEstimate: number | null;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        addressId: string;
    }>;
    updateOrderStatus(userId: string, userRole: Role, orderId: string, newStatus: OrderStatus, prepTimeEstimate?: number): Promise<({
        address: {
            label: string;
            street: string;
            city: string;
        };
        items: {
            id: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
            menuItemId: string | null;
            orderId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.OrderStatus;
        idempotencyKey: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        tax: import("@prisma/client-runtime-utils").Decimal;
        deliveryFee: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        prepTimeEstimate: number | null;
        createdAt: Date;
        updatedAt: Date;
        customerId: string;
        addressId: string;
    }) | null>;
    handleDeliveryStatusChanged(payload: {
        orderId: string;
        newStatus: OrderStatus;
        driverId: string;
    }): Promise<void>;
}
