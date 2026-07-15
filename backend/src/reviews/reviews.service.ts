import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new review for a delivered order.
   */
  async createReview(userId: string, orderId: string, dto: CreateReviewDto) {
    // 1. Verify the order exists and belongs to the customer
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order not found`);
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only review your own orders.');
    }

    // 2. Verify the order is DELIVERED
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `You cannot review an order that is currently ${order.status}. Order must be DELIVERED.`,
      );
    }

    try {
      // 3. Create the review
      const review = await this.prisma.review.create({
        data: {
          orderId,
          customerId: userId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
      
      this.logger.log(`Review created for order ${orderId} by user ${userId}`);
      return review;
    } catch (error) {
      // 4. Catch Prisma unique constraint violation (P2002) for idempotency
      if (error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this order.');
      }
      throw error;
    }
  }

  /**
   * Get the review for a specific order.
   */
  async getReviewByOrderId(orderId: string) {
    const review = await this.prisma.review.findUnique({
      where: { orderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            // Don't leak last name entirely or phone/email
            lastName: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found for this order.');
    }

    // Mask PII before returning
    if (review.customer && review.customer.lastName) {
      review.customer.lastName = review.customer.lastName.charAt(0) + '.';
    }

    return review;
  }

  /**
   * Get recent reviews for the public landing page.
   * Optionally filtered by minimum rating.
   */
  async getRecentReviews(minRating?: number, limit: number = 10) {
    const whereClause: any = {};
    if (minRating) {
      whereClause.rating = { gte: minRating };
    }

    const reviews = await this.prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true, // we will mask this below
          },
        },
      },
    });

    // Mask PII: Only return first name and last initial
    return reviews.map((review) => {
      const maskedLastName = review.customer?.lastName
        ? review.customer.lastName.charAt(0) + '.'
        : '';
        
      return {
        ...review,
        customer: {
          firstName: review.customer?.firstName,
          lastName: maskedLastName,
        },
      };
    });
  }
}
