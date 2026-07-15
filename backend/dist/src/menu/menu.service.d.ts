import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
export declare class MenuService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    getPublicMenu(): Promise<any>;
    createCategory(dto: CreateCategoryDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
    }>;
    deleteCategory(id: string): Promise<void>;
    createMenuItem(dto: CreateMenuItemDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isAvailable: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        imageUrl: string | null;
        ingredients: string | null;
        categoryId: string;
    }>;
    updateMenuItem(id: string, dto: UpdateMenuItemDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isAvailable: boolean;
        price: import("@prisma/client-runtime-utils").Decimal;
        imageUrl: string | null;
        ingredients: string | null;
        categoryId: string;
    }>;
    deleteMenuItem(id: string): Promise<void>;
    private invalidateMenuCache;
    private findCategoryOrFail;
    private findMenuItemOrFail;
}
