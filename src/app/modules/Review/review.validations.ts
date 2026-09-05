import { z } from 'zod';
import { ReviewStatus } from './review.interfaces';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID!');

const createReviewValidation = z.object({
	body: z.object({
		productId: objectId,
		orderId: objectId.optional(),
		rating: z
			.number({ required_error: 'Rating is required!' })
			.int('Rating must be a whole number!')
			.min(1, 'Rating must be at least 1!')
			.max(5, 'Rating cannot be more than 5!'),
		comment: z
			.string({ required_error: 'Comment is required!' })
			.trim()
			.min(5, 'Comment is too short!')
			.max(1000, 'Comment is too long!')
	})
});

const updateReviewValidation = z.object({
	body: z.object({
		rating: z.number().int('Rating must be a whole number!').min(1).max(5).optional(),
		comment: z.string().trim().min(5, 'Comment is too short!').max(1000, 'Comment is too long!').optional()
	})
});

const moderateReviewValidation = z.object({
	body: z.object({
		status: z.nativeEnum(ReviewStatus, { required_error: 'Status is required!' }),
		adminNote: z.string().max(500, 'Note is too long!').optional()
	})
});

const ReviewValidations = {
	createReviewValidation,
	updateReviewValidation,
	moderateReviewValidation
};

export default ReviewValidations;
