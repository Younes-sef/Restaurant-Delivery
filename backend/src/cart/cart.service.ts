import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { CartResponse, CartLineItem } from './cart.types';
import { CART_KEY } from './cart.constants';

/**
 * 7-day TTL. The cart is refreshed on every write, so active users never
 * lose their cart. Abandoned carts are cleaned up automatically.
 */
const CART_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns the authenticated user's cart with live-priced line items and totals.
   *
   * Price enrichment strategy:
   *  - We store only { menuItemId → quantity } in Redis (lean).
   *  - On read, we fetch current prices from the DB in a single batched query.
   *  - This guarantees the customer always sees up-to-date pricing,
   *    even if an admin updated a price after the item was added to cart.
   *
   * Items whose menuItem no longer exists (soft-deleted) are silently pruned
   * from the cart during this read and removed from Redis asynchronously.
   */
  async getCart(userId: string): Promise<CartResponse> {
    const raw = await this.redis.hgetAll(CART_KEY(userId));

    if (!raw || Object.keys(raw).length === 0) {
      return this.emptyCart();
    }

    const menuItemIds = Object.keys(raw);
    const quantities = raw; // { [menuItemId]: "quantity" }

    // Single batched DB query — fetch only the fields we need
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
    });

    // Build a lookup map for O(1) access when iterating
    const itemMap = new Map(menuItems.map((item) => [item.id, item]));

    const staleItemIds: string[] = [];
    const lineItems: CartLineItem[] = [];

    for (const menuItemId of menuItemIds) {
      const item = itemMap.get(menuItemId);
      const quantity = parseInt(quantities[menuItemId], 10);

      // Prune items that were soft-deleted or made unavailable since being added
      if (!item || !item.isAvailable) {
        staleItemIds.push(menuItemId);
        this.logger.warn(
          `Cart cleanup: item ${menuItemId} is unavailable — removing from cart for user ${userId}`,
        );
        continue;
      }

      const unitPrice = parseFloat(item.price.toString());
      const lineTotal = unitPrice * quantity;

      lineItems.push({
        menuItemId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        unitPrice: unitPrice.toFixed(2),
        quantity,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    // Fire-and-forget cleanup — don't block the response
    if (staleItemIds.length > 0) {
      void this.redis.hdel(CART_KEY(userId), staleItemIds);
    }

    const subtotal = lineItems.reduce(
      (sum, item) => sum + parseFloat(item.lineTotal),
      0,
    );

    return {
      items: lineItems,
      subtotal: subtotal.toFixed(2),
      itemCount: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Adds an item to the cart, or replaces the quantity if it already exists.
   *
   * Design note: we validate the menuItem exists and is available *before*
   * writing to Redis. This keeps the cart in a clean state and gives the
   * client a useful 404 instead of a silent no-op.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponse> {
    await this.findAvailableMenuItemOrFail(dto.menuItemId);

    const key = CART_KEY(userId);
    await this.redis.hset(key, dto.menuItemId, String(dto.quantity));
    await this.redis.expire(key, CART_TTL_SECONDS);

    this.logger.debug(`Cart updated: user=${userId} item=${dto.menuItemId} qty=${dto.quantity}`);

    return this.getCart(userId);
  }

  /**
   * Updates the quantity of an existing item in the cart.
   * Returns 404 if the item is not in the cart (use POST to add it first).
   */
  async updateItem(
    userId: string,
    menuItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const key = CART_KEY(userId);
    const existing = await this.redis.hget(key, menuItemId);

    if (existing === null) {
      throw new NotFoundException(
        `Item ${menuItemId} is not in your cart. Use POST /cart/items to add it.`,
      );
    }

    // Re-validate the item is still available before updating
    await this.findAvailableMenuItemOrFail(menuItemId);

    await this.redis.hset(key, menuItemId, String(dto.quantity));
    await this.redis.expire(key, CART_TTL_SECONDS);

    return this.getCart(userId);
  }

  /**
   * Removes a single item from the cart.
   * Returns the updated cart so the client can re-render without an extra request.
   */
  async removeItem(userId: string, menuItemId: string): Promise<CartResponse> {
    const key = CART_KEY(userId);
    const deleted = await this.redis.hdel(key, [menuItemId]);

    if (deleted === 0) {
      throw new NotFoundException(`Item ${menuItemId} is not in your cart.`);
    }

    return this.getCart(userId);
  }

  /**
   * Clears the entire cart.
   * Called directly by OrderService at checkout — the cart is atomically
   * deleted the moment an Order record is successfully created.
   */
  async clearCart(userId: string): Promise<void> {
    await this.redis.del(CART_KEY(userId));
    this.logger.debug(`Cart cleared for user=${userId}`);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns an empty cart structure — a consistent shape regardless of state.
   * Avoids null/undefined checks in callers and on the frontend.
   */
  private emptyCart(): CartResponse {
    return { items: [], subtotal: '0.00', itemCount: 0 };
  }

  /**
   * Guards all write operations: throws 404 if the item doesn't exist or is
   * unavailable. This prevents phantom items entering the cart.
   */
  private async findAvailableMenuItemOrFail(menuItemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, isAvailable: true },
    });

    if (!item || !item.isAvailable) {
      throw new NotFoundException(
        `Menu item "${menuItemId}" does not exist or is no longer available.`,
      );
    }

    return item;
  }
}
