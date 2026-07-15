import { DeliveriesService } from './deliveries.service';
export declare class DeliveriesController {
    private readonly deliveriesService;
    constructor(deliveriesService: DeliveriesService);
    getActiveDelivery(req: any): Promise<{
        order: {
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
        };
    } & {
        id: string;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedAt: Date | null;
        orderId: string;
        driverId: string | null;
    }>;
    updateDeliveryStatus(req: any, deliveryId: string, action: 'PICKUP' | 'DELIVER' | 'FAIL'): Promise<{
        id: string;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedAt: Date | null;
        orderId: string;
        driverId: string | null;
    }>;
    toggleStatus(req: any, isOnline: boolean): Promise<{
        id: string;
        firstName: string;
        driverStatus: import("@prisma/client").$Enums.DriverStatus | null;
    }>;
    assignDriver(orderId: string, driverId: string): Promise<{
        id: string;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedAt: Date | null;
        orderId: string;
        driverId: string | null;
    }>;
}
