"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MenuService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const MENU_CACHE_KEY = 'public:menu';
const MENU_CACHE_TTL_SECONDS = 60 * 60 * 24;
let MenuService = MenuService_1 = class MenuService {
    prisma;
    redis;
    logger = new common_1.Logger(MenuService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getPublicMenu() {
        const cached = await this.redis.get(MENU_CACHE_KEY);
        if (cached) {
            this.logger.debug('Menu served from cache');
            return JSON.parse(cached);
        }
        this.logger.debug('Cache miss — querying database for menu');
        const categories = await this.prisma.category.findMany({
            where: { isActive: true },
            include: {
                items: {
                    where: { isAvailable: true },
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
        const serialized = categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) => ({
                ...item,
                price: item.price.toString(),
            })),
        }));
        await this.redis.set(MENU_CACHE_KEY, JSON.stringify(serialized), MENU_CACHE_TTL_SECONDS);
        return serialized;
    }
    async createCategory(dto) {
        const existing = await this.prisma.category.findUnique({
            where: { name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
        }
        const category = await this.prisma.category.create({ data: dto });
        await this.invalidateMenuCache();
        return category;
    }
    async updateCategory(id, dto) {
        await this.findCategoryOrFail(id);
        if (dto.name) {
            const nameConflict = await this.prisma.category.findFirst({
                where: { name: dto.name, id: { not: id } },
            });
            if (nameConflict) {
                throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
            }
        }
        const updated = await this.prisma.category.update({
            where: { id },
            data: dto,
        });
        await this.invalidateMenuCache();
        return updated;
    }
    async deleteCategory(id) {
        await this.findCategoryOrFail(id);
        await this.prisma.category.update({
            where: { id },
            data: { isActive: false },
        });
        await this.invalidateMenuCache();
    }
    async createMenuItem(dto) {
        await this.findCategoryOrFail(dto.categoryId);
        const item = await this.prisma.menuItem.create({ data: dto });
        await this.invalidateMenuCache();
        return item;
    }
    async updateMenuItem(id, dto) {
        await this.findMenuItemOrFail(id);
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
    async deleteMenuItem(id) {
        await this.findMenuItemOrFail(id);
        await this.prisma.menuItem.update({
            where: { id },
            data: { isAvailable: false },
        });
        await this.invalidateMenuCache();
    }
    async invalidateMenuCache() {
        await this.redis.del(MENU_CACHE_KEY);
        this.logger.debug('Menu cache invalidated');
    }
    async findCategoryOrFail(id) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) {
            throw new common_1.NotFoundException(`Category with id "${id}" not found`);
        }
        return category;
    }
    async findMenuItemOrFail(id) {
        const item = await this.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item with id "${id}" not found`);
        }
        return item;
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = MenuService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], MenuService);
//# sourceMappingURL=menu.service.js.map