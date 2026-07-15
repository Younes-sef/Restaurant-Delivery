import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createReview(userId: string, orderId: string, dto: CreateReviewDto): Promise<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: Date;
        orderId: string;
        customerId: string;
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
        createdAt: Date;
        orderId: string;
        customerId: string;
    }>;
    getRecentReviews(minRating?: number, limit?: number): Promise<{
        customer: {
            firstName: string;
            lastName: string;
        };
        id: string;
        rating: number;
        comment: string | null;
        createdAt: Date;
        orderId: string;
        customerId: string;
    }[]>;
}
