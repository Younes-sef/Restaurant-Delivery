import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    getRecentReviews(minRating?: string, limit?: string): Promise<{
        customer: {
            firstName: string;
            lastName: string;
        };
        id: string;
        rating: number;
        comment: string | null;
        orderId: string;
        customerId: string;
        createdAt: Date;
    }[]>;
    createReview(req: any, orderId: string, dto: CreateReviewDto): Promise<{
        id: string;
        rating: number;
        comment: string | null;
        orderId: string;
        customerId: string;
        createdAt: Date;
    }>;
    getReviewByOrderId(orderId: string): Promise<{
        customer: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        rating: number;
        comment: string | null;
        orderId: string;
        customerId: string;
        createdAt: Date;
    }>;
}
