import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: {
            getRecentReviews: jest.fn(),
            createReview: jest.fn(),
            getReviewByOrderId: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get recent reviews', async () => {
    jest.spyOn(service, 'getRecentReviews').mockResolvedValue([]);
    await controller.getRecentReviews('4', '5');
    expect(service.getRecentReviews).toHaveBeenCalledWith(4, 5);
  });

  it('should create review', async () => {
    jest.spyOn(service, 'createReview').mockResolvedValue({ id: '1' } as any);
    await controller.createReview({ user: { sub: 'u1' } }, 'o1', { rating: 5 });
    expect(service.createReview).toHaveBeenCalledWith('u1', 'o1', { rating: 5 });
  });

  it('should get review by order id', async () => {
    jest.spyOn(service, 'getReviewByOrderId').mockResolvedValue({ id: '1' } as any);
    await controller.getReviewByOrderId('o1');
    expect(service.getReviewByOrderId).toHaveBeenCalledWith('o1');
  });
});
