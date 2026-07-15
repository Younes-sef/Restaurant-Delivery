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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * UsersController
 *
 * Handles customer-facing profile and address management.
 * All endpoints require a valid JWT (HttpOnly cookie or Bearer token).
 *
 * Address ownership is enforced at the service layer:
 *  - userId is always extracted from the verified JWT, never trusted from the body.
 *  - Attempting to mutate another user's address returns 403.
 */
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---------------------------------------------------------------------------
  // Address Management
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/users/addresses
   * Returns all saved delivery addresses for the authenticated customer.
   */
  @Get('addresses')
  getAddresses(@Req() req: Request & { user?: any }) {
    return this.usersService.getAddresses(req.user.sub);
  }

  /**
   * POST /api/v1/users/addresses
   * Adds a new delivery address to the authenticated customer's account.
   */
  @Post('addresses')
  createAddress(
    @Req() req: Request & { user?: any },
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(req.user.sub, dto);
  }

  /**
   * PUT /api/v1/users/addresses/:id
   * Updates a specific address. Ownership is verified server-side.
   * Returns 403 if the address belongs to another user.
   */
  @Put('addresses/:id')
  updateAddress(
    @Req() req: Request & { user?: any },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.sub, id, dto);
  }

  /**
   * DELETE /api/v1/users/addresses/:id
   * Removes a specific address. Ownership is verified server-side.
   * Returns 204 No Content on success.
   */
  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAddress(
    @Req() req: Request & { user?: any },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deleteAddress(req.user.sub, id);
  }
}
