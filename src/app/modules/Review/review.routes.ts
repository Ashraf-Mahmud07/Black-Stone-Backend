import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import validateRequest from '../../middlewares/validateRequest';
import ReviewControllers from './review.controllers';
import ReviewValidations from './review.validations';

const router = express.Router();

// public - approved reviews only
router.get('/product/:productId', ReviewControllers.getProductReviews);

// customer
router.get('/my-reviews', AuthGuard(UserRole.Customer), ReviewControllers.getMyReviews);

router.post(
	'/',
	AuthGuard(UserRole.Customer),
	validateRequest(ReviewValidations.createReviewValidation),
	ReviewControllers.createReview
);

router.patch(
	'/:id',
	AuthGuard(UserRole.Customer),
	validateRequest(ReviewValidations.updateReviewValidation),
	ReviewControllers.updateReview
);

router.delete('/:id', AuthGuard(UserRole.Customer, UserRole.Admin), ReviewControllers.deleteReview);

// admin moderation
router.get('/', AuthGuard(UserRole.Admin), ReviewControllers.getReviews);

router.patch(
	'/:id/status',
	AuthGuard(UserRole.Admin),
	validateRequest(ReviewValidations.moderateReviewValidation),
	ReviewControllers.moderateReview
);

const ReviewRoutes = router;

export default ReviewRoutes;
