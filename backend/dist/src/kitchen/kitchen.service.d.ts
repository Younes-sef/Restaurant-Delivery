import { PrismaService } from '../prisma/prisma.service';
export declare class KitchenService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getActiveOrders(): Promise<({
        items: {
            id: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            itemName: string;
            orderId: string;
            menuItemId: string | null;
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
        customerId: string;
        addressId: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
