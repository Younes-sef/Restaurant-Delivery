import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * GET /api/v1/reviews/recent
   * Public endpoint to fetch recent reviews.
   * Can optionally filter by minimum rating.
   */
  @Get('reviews/recent')
  async getRecentReviews(
    @Query('minRating') minRating?: string,
    @Query('limit') limit?: string,
  ) {
    const min = minRating ? parseInt(minRating, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reviewsService.getRecentReviews(min, limitNum);
  }

  /**
   * POST /api/v1/orders/:orderId/reviews
   * Only customers can submit a review.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @Post('orders/:orderId/reviews')
  async createReview(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(req.user.sub, orderId, dto);
  }

  /**
   * GET /api/v1/orders/:orderId/reviews
   * Fetch a specific review for an order.
   */
  @Get('orders/:orderId/reviews')
  async getReviewByOrderId(@Param('orderId') orderId: string) {
    return this.reviewsService.getReviewByOrderId(orderId);
  }
}
