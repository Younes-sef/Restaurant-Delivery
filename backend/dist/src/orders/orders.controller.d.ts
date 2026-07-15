import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(req: Request & {
        user?: any;
    }, dto: CreateOrderDto): Promise<{
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
    getMyOrders(req: Request & {
        user?: any;
    }): Promise<({
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
    getOrderById(req: Request & {
        user?: any;
    }, id: string): Promise<{
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
    updateOrderStatus(req: Request & {
        user?: any;
    }, id: string, dto: UpdateOrderStatusDto): Promise<({
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
}
