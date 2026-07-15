import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * OrdersController
 *
 * Endpoints fall into three access tiers:
 *
 *  Customer  — place order, view own orders, cancel (PLACED only)
 *  Staff/Admin — view all orders, confirm/reject
 *  Kitchen/Driver — advance the order through preparation & delivery stages
 *
 * All role and state-machine enforcement lives in OrdersService so this
 * controller stays thin — routing + input extraction only.
 *
 * IMPORTANT: @Get('my') MUST be declared before @Get(':id') so NestJS
 * matches the literal 'my' route before the UUID parameter route.
 */
@UseGuards(JwtAuthGuard)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ---------------------------------------------------------------------------
  // Customer Endpoints
  // ---------------------------------------------------------------------------

  /**
   * POST /api/v1/orders
   *
   * Converts the customer's cart into a confirmed order.
   * Requires a non-empty cart in Redis and a valid delivery address.
   *
   * Returns 409 Conflict if the idempotency key has been used before.
   * Returns 400 Bad Request if the cart is empty or items are unavailable.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Req() req: Request & { user?: any },
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(req.user.sub, dto);
  }

  /**
   * GET /api/v1/orders/my
   *
   * Returns the authenticated customer's full order history, newest first.
   * Must be declared BEFORE @Get(':id') to avoid 'my' being parsed as a UUID.
   */
  @Get('my')
  getMyOrders(@Req() req: Request & { user?: any }) {
    return this.ordersService.getMyOrders(req.user.sub);
  }

  // ---------------------------------------------------------------------------
  // Staff / Admin Endpoints
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/orders
   *
   * Returns all orders (staff and admin only), sorted by newest first.
   * Includes customer contact info and delivery address for dispatching.
   */
  @UseGuards(RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  // ---------------------------------------------------------------------------
  // Shared Endpoints (all authenticated roles)
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/orders/:id
   *
   * Returns a single order by ID.
   *  - Customers: can only access their own orders (403 otherwise)
   *  - Staff / Admin / Kitchen / Driver: can access any order
   */
  @Get(':id')
  getOrderById(
    @Req() req: Request & { user?: any },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderById(req.user.sub, req.user.role, id);
  }

  /**
   * PATCH /api/v1/orders/:id/status
   *
   * Unified status transition endpoint for all roles.
   * The service enforces:
   *   1. Role permission  — not every role can set every status
   *   2. State machine    — only valid transitions are accepted
   *   3. Concurrency      — optimistic lock → 409 if concurrent modification
   *
   * Examples by role:
   *  Customer → CANCELLED        (only while PLACED)
   *  Staff    → CONFIRMED / CANCELLED
   *  Kitchen  → PREPARING / READY_FOR_PICKUP  (+ optional prepTimeEstimate)
   *  Driver   → PICKED_UP / DELIVERED / DELIVERY_FAILED
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(
    @Req() req: Request & { user?: any },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      req.user.sub,
      req.user.role,
      id,
      dto.status,
      dto.prepTimeEstimate,
    );
  }
}
