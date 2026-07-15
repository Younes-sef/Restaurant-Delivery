import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

/**
 * The Redis key used to cache the entire public menu payload.
 * Centralising it here prevents typo-driven cache miss bugs.
 */
const MENU_CACHE_KEY = 'public:menu';

/**
 * 24-hour TTL. The cache is always invalidated on write, so this is just
 * a safety net to ensure stale data doesn't linger if a bug is introduced.
 */
const MENU_CACHE_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  /**
   * Returns the full menu grouped by active categories.
   * Only active categories and available items are included.
   *
   * Cache-Aside Pattern:
   *  1. Try to serve from Redis (< 1ms).
   *  2. On cache miss, query PostgreSQL, then populate the cache.
   *
   * Prisma returns `price` as a Decimal object. We serialize it to a plain
   * number string here so the JSON response is clean and predictable for
   * frontend consumers.
   */
  async getPublicMenu() {
    // --- Step 1: Cache read ---
    const cached = await this.redis.get(MENU_CACHE_KEY);
    if (cached) {
      this.logger.debug('Menu served from cache');
      return JSON.parse(cached);
    }

    // --- Step 2: DB read ---
    this.logger.debug('Cache miss — querying database for menu');
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isAvailable: true },
          // Only send the fields the frontend actually needs
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            ingredients: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Serialize Decimal → string so JSON.stringify produces "10.99", not {}
    const serialized = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        price: item.price.toString(),
      })),
    }));

    // --- Step 3: Populate cache ---
    await this.redis.set(MENU_CACHE_KEY, JSON.stringify(serialized), MENU_CACHE_TTL_SECONDS);

    return serialized;
  }

  // ---------------------------------------------------------------------------
  // Categories (Admin)
  // ---------------------------------------------------------------------------

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    const category = await this.prisma.category.create({ data: dto });
    await this.invalidateMenuCache();
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findCategoryOrFail(id);

    // If the name is being changed, ensure no duplicate exists
    if (dto.name) {
      const nameConflict = await this.prisma.category.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (nameConflict) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    await this.invalidateMenuCache();
    return updated;
  }

  /**
   * Soft delete — sets isActive to false.
   * The record remains in the database for referential integrity and reporting.
   */
  async deleteCategory(id: string) {
    await this.findCategoryOrFail(id);

    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    await this.invalidateMenuCache();
  }

  // ---------------------------------------------------------------------------
  // Menu Items (Admin)
  // ---------------------------------------------------------------------------

  async createMenuItem(dto: CreateMenuItemDto) {
    // Validate foreign key before Prisma throws an opaque DB error
    await this.findCategoryOrFail(dto.categoryId);

    const item = await this.prisma.menuItem.create({ data: dto });
    await this.invalidateMenuCache();
    return item;
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
    await this.findMenuItemOrFail(id);

    // If categoryId is being changed, validate the new category exists
    if (dto.categoryId) {
      await this.findCategoryOrFail(dto.categoryId);
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: dto,
    });
    await this.invalidateMenuCache();
    return updated;
  }

  /**
   * Soft delete — sets isAvailable to false.
   * Preserves the item for historical order data (OrderItem references).
   */
  async deleteMenuItem(id: string) {
    await this.findMenuItemOrFail(id);

    await this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: false },
    });
    await this.invalidateMenuCache();
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Clears the cached menu payload so the next GET /menu call
   * re-queries the database and serves fresh data.
   * Called after every mutating admin operation.
   */
  private async invalidateMenuCache(): Promise<void> {
    await this.redis.del(MENU_CACHE_KEY);
    this.logger.debug('Menu cache invalidated');
  }

  private async findCategoryOrFail(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    return category;
  }

  private async findMenuItemOrFail(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Menu item with id "${id}" not found`);
    }
    return item;
  }
}
