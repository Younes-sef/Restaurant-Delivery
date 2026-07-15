"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    prisma;
    logger = new common_1.Logger(ReviewsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReview(userId, orderId, dto) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order not found`);
        }
        if (order.customerId !== userId) {
            throw new common_1.ForbiddenException('You can only review your own orders.');
        }
        if (order.status !== client_1.OrderStatus.DELIVERED) {
            throw new common_1.BadRequestException(`You cannot review an order that is currently ${order.status}. Order must be DELIVERED.`);
        }
        try {
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
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('You have already reviewed this order.');
            }
            throw error;
        }
    }
    async getReviewByOrderId(orderId) {
        const review = await this.prisma.review.findUnique({
            where: { orderId },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!review) {
            throw new common_1.NotFoundException('Review not found for this order.');
        }
        if (review.customer && review.customer.lastName) {
            review.customer.lastName = review.customer.lastName.charAt(0) + '.';
        }
        return review;
    }
    async getRecentReviews(minRating, limit = 10) {
        const whereClause = {};
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
                        lastName: true,
                    },
                },
            },
        });
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
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map