import { OrderStatus, Role } from '@prisma/client';
export declare const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]>;
export declare const ROLE_ALLOWED_TRANSITIONS: Partial<Record<Role, OrderStatus[]>>;
export declare const TAX_RATE = 0.1;
export declare const DELIVERY_FEE_CENTS = 300;
