import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  /**
   * The target status to transition to.
   * The server enforces the state machine and role-based permissions.
   *
   * Valid transitions:
   *  PLACED          → CONFIRMED | CANCELLED
   *  CONFIRMED       → PREPARING
   *  PREPARING       → READY_FOR_PICKUP
   *  READY_FOR_PICKUP → PICKED_UP
   *  PICKED_UP       → DELIVERED | DELIVERY_FAILED
   */
  @IsEnum(OrderStatus)
  status: OrderStatus;

  /**
   * Optional prep time estimate in minutes.
   * Kitchen staff should include this when moving an order to PREPARING.
   * Stored on the order for the customer to see.
   */
  @IsInt()
  @Min(1)
  @Max(180)
  @IsOptional()
  prepTimeEstimate?: number;
}
