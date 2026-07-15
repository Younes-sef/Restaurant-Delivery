import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OrderStatus, Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { CART_KEY } from '../cart/cart.constants';
import {
  VALID_TRANSITIONS,
  ROLE_ALLOWED_TRANSITIONS,
  TAX_RATE,
  DELIVERY_FEE_CENTS,
} from './orders.types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  /**
   * Converts the customer's Redis cart into a persisted Order.
   *
   * All database operations run inside a single Prisma transaction so the
   * system cannot end up with a partially-created order:
   *
   *  1. Idempotency check    → 409 if order with this key already exists
   *  2. Address ownership    → 403 if address doesn't belong to the customer
   *  3. Cart validation      → 400 if cart is empty
   *  4. Item availability    → 400 if any item was removed/made unavailable
   *  5. Price calculation    → integer-cent arithmetic (no floating-point error)
   *  6. Order creation       → Order + OrderItems created atomically
   *
   * After the transaction the Redis cart is cleared. If that Redis delete
   * fails the cart expires naturally after 7 days — non-fatal.
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      // --- Step 1: Idempotency check ---
      const existingOrder = await tx.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingOrder) {
        throw new ConflictException(
          'An order with this idempotency key already exists.',
        );
      }

      // --- Step 2: Address ownership ---
      const address = await tx.address.findUnique({
        where: { id: dto.addressId },
      });
      if (!address) {
        throw new NotFoundException(`Address "${dto.addressId}" not found`);
      }
      if (address.userId !== userId) {
        throw new ForbiddenException(
          'The provided address does not belong to you.',
        );
      }

      // --- Step 3: Read cart from Redis ---
      const rawCart = await this.redis.hgetAll(CART_KEY(userId));
      if (!rawCart || Object.keys(rawCart).length === 0) {
        throw new BadRequestException(
          'Your cart is empty. Add items before placing an order.',
        );
      }

      const menuItemIds = Object.keys(rawCart);

      // --- Step 4: Validate items are still available ---
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: menuItemIds }, isAvailable: true },
        select: { id: true, name: true, price: true },
      });

      if (menuItems.length !== menuItemIds.length) {
        // Identify which items are the problem for a helpful error message
        const foundIds = new Set(menuItems.map((m) => m.id));
        const missingIds = menuItemIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `The following items are no longer available: ${missingIds.join(', ')}. ` +
            'Please update your cart and try again.',
        );
      }

      // --- Step 5: Calculate totals using integer-cent arithmetic ---
      // Working in cents avoids JavaScript floating-point precision issues.
      // e.g. $9.99 → 999 cents, then /100 back to decimal only at the end.
      const itemMap = new Map(menuItems.map((item) => [item.id, item]));
      let subtotalCents = 0;

      const orderItemsData = menuItemIds.map((menuItemId) => {
        const item = itemMap.get(menuItemId)!;
        const quantity = parseInt(rawCart[menuItemId], 10);
        const priceCents = Math.round(
          parseFloat(item.price.toString()) * 100,
        );
        subtotalCents += priceCents * quantity;

        return {
          quantity,
          unitPrice: item.price,  // store exact Prisma Decimal
          itemName: item.name,    // snapshot the name so it's preserved even if item is renamed later
          menuItemId: item.id,
        };
      });

      const taxCents = Math.round(subtotalCents * TAX_RATE);
      const totalCents = subtotalCents + taxCents + DELIVERY_FEE_CENTS;

      // --- Step 6: Create Order + OrderItems atomically ---
      const created = await tx.order.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          customerId: userId,
          addressId: dto.addressId,
          subtotal:     (subtotalCents / 100).toFixed(2),
          tax:          (taxCents / 100).toFixed(2),
          deliveryFee:  (DELIVERY_FEE_CENTS / 100).toFixed(2),
          totalAmount:  (totalCents / 100).toFixed(2),
          items: { create: orderItemsData },
        },
        include: {
          items: true,
          address: { select: { label: true, street: true, city: true } },
        },
      });

      this.logger.log(
        `Order created: id=${created.id} customer=${userId} total=${created.totalAmount}`,
      );

      return created;
    });

    // Clear cart after the DB transaction commits successfully.
    // This is intentionally outside the transaction — Redis is a separate system.
    this.redis.del(CART_KEY(userId)).catch((err) =>
      this.logger.error(
        `Failed to clear cart for user=${userId} after order creation`,
        err,
      ),
    );

    return order;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Returns the authenticated customer's order history, newest first.
   */
  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { itemName: true, quantity: true, unitPrice: true } },
        address: { select: { label: true, street: true, city: true } },
      },
    });
  }

  /**
   * Returns all orders for staff/admin, newest first.
   * In a production system this would be paginated.
   */
  async getAllOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { itemName: true, quantity: true, unitPrice: true } },
        address: { select: { label: true, street: true, city: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  /**
   * Returns a single order by ID with access control:
   *  - CUSTOMER: can only view their own orders (403 otherwise)
   *  - STAFF / ADMIN / KITCHEN / DRIVER: can view any order
   */
  async getOrderById(userId: string, userRole: Role, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }

    if (userRole === Role.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  // ---------------------------------------------------------------------------
  // State Machine
  // ---------------------------------------------------------------------------

  /**
   * Advances an order to the requested status, enforcing:
   *
   *  1. Role permission check  — the caller's role must be allowed to set this status
   *  2. State machine check    — the transition must be valid from the current status
   *  3. Ownership check        — customers can only update their own orders
   *  4. Optimistic locking     — updateMany with current status in WHERE clause
   *                              guarantees atomicity; if count=0 → 409 Conflict
   *
   * The 409 Conflict case handles the real-world race condition where a customer
   * cancels at the exact same moment as staff confirms an order. Only one request
   * wins — the other receives a 409 and should inform the user to refresh.
   */
  async updateOrderStatus(
    userId: string,
    userRole: Role,
    orderId: string,
    newStatus: OrderStatus,
    prepTimeEstimate?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Fetch the current order to know its state
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order "${orderId}" not found`);
      }

      // --- Check 1: Ownership (customers only) ---
      if (userRole === Role.CUSTOMER && order.customerId !== userId) {
        throw new ForbiddenException('You do not have access to this order');
      }

      // --- Check 2: Role permission ---
      const allowedForRole = ROLE_ALLOWED_TRANSITIONS[userRole] ?? [];
      if (!allowedForRole.includes(newStatus)) {
        throw new ForbiddenException(
          `Your role (${userRole}) is not permitted to set order status to "${newStatus}".`,
        );
      }

      // --- Check 3: State machine validity ---
      const validNextStatuses = VALID_TRANSITIONS[order.status];
      if (!validNextStatuses.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid transition: cannot move order from "${order.status}" to "${newStatus}". ` +
            `Allowed next statuses: [${validNextStatuses.join(', ') || 'none — terminal state'}]`,
        );
      }

      // --- Check 4: Atomic optimistic-lock update ---
      // The WHERE clause includes the current status. If the status changed
      // between our findUnique and this update (concurrent request), count = 0.
      const result = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: newStatus,
          // Only update prepTimeEstimate if provided (kitchen sets this)
          ...(prepTimeEstimate !== undefined && { prepTimeEstimate }),
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'The order status was changed by another operation simultaneously. ' +
            'Please refresh and try again.',
        );
      }

      this.logger.log(
        `Order ${orderId} transitioned: ${order.status} → ${newStatus} by user=${userId} role=${userRole}`,
      );

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          address: { select: { label: true, street: true, city: true } },
        },
      });

      // Emit domain event for decoupling (e.g. Kitchen KDS, Notifications)
      this.eventEmitter.emit('order.status.changed', {
        orderId,
        oldStatus: order.status,
        newStatus,
        order: updatedOrder,
      });

      return updatedOrder;
    });
  }

  // ---------------------------------------------------------------------------
  // Event Listeners
  // ---------------------------------------------------------------------------

  /**
   * Listens for delivery status changes and updates the order status independently.
   * This ensures DeliveriesModule doesn't directly mutate the Orders database.
   */
  @OnEvent('delivery.status.changed')
  async handleDeliveryStatusChanged(payload: { orderId: string; newStatus: OrderStatus; driverId: string }) {
    this.logger.log(
      `Received delivery.status.changed event for Order ${payload.orderId}. Updating to ${payload.newStatus}...`,
    );

    try {
      const existing = await this.prisma.order.findUnique({ where: { id: payload.orderId } });
      this.logger.log(`DEBUG DB CHECK: Order exists? ${!!existing}`);
      await this.prisma.order.update({
        where: { id: payload.orderId },
        data: { status: payload.newStatus },
      });
      this.logger.log(`Successfully synced Order ${payload.orderId} status to ${payload.newStatus}`);
    } catch (error) {
      this.logger.error(`Failed to sync Order ${payload.orderId} status to ${payload.newStatus}`, error);
    }
  }
}
