import { OrderStatus, Role } from '@prisma/client';

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

/**
 * Defines every valid transition in the order lifecycle.
 * Any transition not listed here is rejected with 400 Bad Request.
 *
 * Terminal states (DELIVERED, CANCELLED, DELIVERY_FAILED) have empty arrays,
 * meaning no further transitions are possible once reached.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DELIVERY_FAILED]: [],
};

// ---------------------------------------------------------------------------
// Role-Based Transition Permissions
// ---------------------------------------------------------------------------

/**
 * Maps each role to the set of statuses they are allowed to SET.
 * This is checked IN ADDITION to the state machine — both must pass.
 *
 * Example: A DRIVER can only move an order to PICKED_UP, DELIVERED, or
 * DELIVERY_FAILED. Even if the state machine would allow it, a CUSTOMER
 * cannot set status to CONFIRMED.
 */
export const ROLE_ALLOWED_TRANSITIONS: Partial<Record<Role, OrderStatus[]>> = {
  [Role.CUSTOMER]: [OrderStatus.CANCELLED],
  [Role.STAFF]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [Role.ADMIN]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [Role.KITCHEN]: [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP],
  [Role.DRIVER]:  [OrderStatus.PICKED_UP, OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
};

// ---------------------------------------------------------------------------
// Business Rules Constants
// ---------------------------------------------------------------------------

/**
 * VAT / tax rate applied to every order subtotal.
 * 10% expressed as a multiplier.
 */
export const TAX_RATE = 0.10;

/**
 * Flat delivery fee in cents to avoid floating-point arithmetic.
 * $3.00 = 300 cents.
 */
export const DELIVERY_FEE_CENTS = 300;
