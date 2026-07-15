import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class DeliveriesService {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    assignDriver(orderId: string, driverId: string): Promise<{
        id: string;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedAt: Date | null;
        orderId: string;
        driverId: string | null;
    }>;
    toggleDriverStatus(driverId: string, isOnline: boolean): Promise<{
        id: string;
        firstName: string;
        driverStatus: import("@prisma/client").$Enums.DriverStatus | null;
    }>;
    getActiveDelivery(driverId: string): Promise<{
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
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            idempotencyKey: string;
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            tax: import("@prisma/client-runtime-utils").Decimal;
            deliveryFee: import("@prisma/client-runtime-utils").Decimal;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            prepTimeEstimate: number | null;
            addressId: string;
            customerId: string;
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
    updateDeliveryStatus(deliveryId: string, driverId: string, action: 'PICKUP' | 'DELIVER' | 'FAIL'): Promise<{
        id: string;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedAt: Date | null;
        orderId: string;
        driverId: string | null;
    }>;
}
