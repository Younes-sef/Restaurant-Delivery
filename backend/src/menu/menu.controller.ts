import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * MenuController
 *
 * Two tiers of endpoints:
 *
 *  1. Public  — GET /api/v1/menu
 *               No auth required. Served from Redis cache.
 *
 *  2. Admin   — POST/PATCH/DELETE /api/v1/menu/...
 *               Requires a valid JWT AND the ADMIN role.
 *               Every mutating operation invalidates the cache.
 */
@Controller('api/v1/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ---------------------------------------------------------------------------
  // Public Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Returns the full restaurant menu grouped by active categories.
   * Each category includes only its available items.
   *
   * This is the most frequently called endpoint and is served entirely
   * from Redis after the first request.
   */
  @Get()
  getPublicMenu() {
    return this.menuService.getPublicMenu();
  }

  // ---------------------------------------------------------------------------
  // Admin — Category Management
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, dto);
  }

  /**
   * Soft-deletes a category by setting `isActive = false`.
   * Returns 204 No Content on success (nothing meaningful to return).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.deleteCategory(id);
  }

  // ---------------------------------------------------------------------------
  // Admin — Menu Item Management
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('items')
  createMenuItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createMenuItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('items/:id')
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(id, dto);
  }

  /**
   * Soft-deletes a menu item by setting `isAvailable = false`.
   * The record persists for historical order integrity.
   * Returns 204 No Content on success.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMenuItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.deleteMenuItem(id);
  }
}
