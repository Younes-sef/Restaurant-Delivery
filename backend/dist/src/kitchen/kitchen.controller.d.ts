import { KitchenService } from './kitchen.service';
export declare class KitchenController {
    private readonly kitchenService;
    constructor(kitchenService: KitchenService);
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
