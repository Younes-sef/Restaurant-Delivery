import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active queue of orders for the Kitchen Display System (KDS).
   * It only retrieves orders that the kitchen cares about:
   *  - CONFIRMED (ready to start)
   *  - PREPARING (currently cooking)
   *  - READY_FOR_PICKUP (waiting for driver)
   * 
   * Orders are sorted oldest first so the kitchen knows what to prioritize.
   */
  async getActiveOrders() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
          ],
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest first (FIFO)
      },
      include: {
        items: true,
      },
    });
  }
}
