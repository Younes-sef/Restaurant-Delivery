import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  // --- Driver Endpoints ---
  @Get('driver/active')
  @Roles(Role.DRIVER) // Only drivers can access these endpoints
  async getActiveDelivery(@Req() req: any) {
    const driverId = req.user.sub;
    return this.deliveriesService.getActiveDelivery(driverId);
  }

  @Patch('driver/:id/status')
  @Roles(Role.DRIVER) // Only drivers can update delivery status
  async updateDeliveryStatus(
    @Req() req: any,
    @Param('id') deliveryId: string,
    @Body('action') action: 'PICKUP' | 'DELIVER' | 'FAIL',
  ) {
    const driverId = req.user.sub;
    return this.deliveriesService.updateDeliveryStatus(
      deliveryId,
      driverId,
      action,
    );
  }

  @Patch('status')
  @Roles(Role.DRIVER) // Only drivers can toggle their status
  async toggleStatus(
    @Req() req: any,
    @Body('isOnline') isOnline: boolean,
  ) {
    const driverId = req.user.sub;
    return this.deliveriesService.toggleDriverStatus(driverId, isOnline);
  }

  // --- Staff Endpoints ---
  @Post('staff/orders/:orderId/assign-driver')
  @Roles(Role.STAFF, Role.ADMIN) // Staff and admins assign drivers
  async assignDriver(
    @Param('orderId') orderId: string,
    @Body('driverId') driverId: string,
  ) {
    return this.deliveriesService.assignDriver(orderId, driverId);
  }
}
