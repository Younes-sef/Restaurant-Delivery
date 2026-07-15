import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * CartController
 *
 * Manages the server-side shopping cart for authenticated customers.
 * Cart state lives entirely in Redis — no database writes occur here.
 *
 * Security:
 *  - Every endpoint is behind JwtAuthGuard.
 *  - The `userId` is always extracted from the verified JWT payload (req.user.sub),
 *    never accepted from the request body or query params. A user can only ever
 *    read and mutate their own cart.
 *
 * All mutating endpoints (POST, PUT, DELETE item) return the updated cart
 * so the client can re-render without issuing a second GET request.
 */
@UseGuards(JwtAuthGuard)
@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * GET /api/v1/cart
   *
   * Returns the current cart with live-priced line items and a calculated subtotal.
   * An empty cart (or a cart that has expired) returns { items: [], subtotal: "0.00", itemCount: 0 }.
   */
  @Get()
  getCart(@Req() req: Request & { user?: any }) {
    return this.cartService.getCart(req.user.sub);
  }

  /**
   * POST /api/v1/cart/items
   *
   * Adds a menu item to the cart, or overwrites the quantity if it already exists.
   * Returns 404 if the menuItem does not exist or is unavailable.
   * Returns the updated cart.
   */
  @Post('items')
  addItem(
    @Req() req: Request & { user?: any },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(req.user.sub, dto);
  }

  /**
   * PUT /api/v1/cart/items/:menuItemId
   *
   * Updates the quantity of an item already in the cart.
   * Returns 404 if the item is not currently in the cart.
   * Returns the updated cart.
   */
  @Put('items/:menuItemId')
  updateItem(
    @Req() req: Request & { user?: any },
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.sub, menuItemId, dto);
  }

  /**
   * DELETE /api/v1/cart/items/:menuItemId
   *
   * Removes a single line item from the cart.
   * Returns 404 if the item is not in the cart.
   * Returns the updated cart (so the client doesn't need a follow-up GET).
   */
  @Delete('items/:menuItemId')
  removeItem(
    @Req() req: Request & { user?: any },
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.cartService.removeItem(req.user.sub, menuItemId);
  }

  /**
   * DELETE /api/v1/cart
   *
   * Clears the entire cart. Returns 204 No Content.
   * This endpoint is also called internally by OrderService at checkout,
   * but is exposed here so customers can explicitly empty their cart via the UI.
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCart(@Req() req: Request & { user?: any }) {
    return this.cartService.clearCart(req.user.sub);
  }
}
