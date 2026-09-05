import { ReviewStatus } from '../../modules/Review/review.interfaces';
import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Reviews';

export const reviewPaths: TPathsObject = {
	'/api/reviews/product/{productId}': {
		get: {
			tags: [TAG],
			summary: 'List approved reviews of a product',
			description:
				'**Public.** Only `approved` reviews are returned - pending and rejected reviews are never exposed publicly. The product rating aggregate (`ratingAverage`, `ratingCount`) is derived from these reviews.',
			operationId: 'getProductReviews',
			security: [], // public endpoint
			parameters: [
				parameterRef('ProductIdParam'),
				parameterRef('Page'),
				parameterRef('Limit'),
				parameterRef('SortBy'),
				parameterRef('SortOrder')
			],
			responses: {
				'200': listResponse('Reviews retrieved successfully!', ref('Review')),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/reviews/my-reviews': {
		get: {
			tags: [TAG],
			summary: 'List my reviews',
			description:
				'**Customer.** Returns the reviews written by the authenticated customer, including pending and rejected ones.',
			operationId: 'getMyReviews',
			security: bearerAuth,
			parameters: [parameterRef('Page'), parameterRef('Limit'), parameterRef('SortBy'), parameterRef('SortOrder')],
			responses: {
				'200': listResponse('Reviews retrieved successfully!', ref('Review')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/reviews': {
		post: {
			tags: [TAG],
			summary: 'Submit a review',
			description:
				'**Customer.** Rating must be a whole number between 1 and 5. A customer can review a product only once. Reviews written by a customer with a delivered order for that product are flagged `isVerifiedPurchase`. Every review starts as `pending` and becomes public only after an admin approves it.',
			operationId: 'createReview',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('CreateReviewRequest'),
						example: {
							productId: '6650f1a2b3c4d5e6f7a8b9c0',
							rating: 5,
							comment: 'Loved the fabric quality, will buy again.'
						}
					}
				}
			},
			responses: {
				'201': successResponse('Review submitted successfully! It will be published once approved.', ref('Review')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'409': {
					description: 'This customer has already reviewed the product.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'You have already reviewed this product!',
								errorSources: [{ path: '', message: 'You have already reviewed this product!' }]
							}
						}
					}
				},
				'500': responseRef('ServerError')
			}
		},
		get: {
			tags: [TAG, 'Admin'],
			summary: 'List reviews for moderation',
			description: '**Admin.** Moderation queue across all products and statuses.',
			operationId: 'getReviews',
			security: bearerAuth,
			parameters: [
				parameterRef('Page'),
				parameterRef('Limit'),
				parameterRef('SortBy'),
				parameterRef('SortOrder'),
				{
					name: 'status',
					in: 'query',
					description: 'Filter by moderation status.',
					required: false,
					schema: { type: 'string', enum: Object.values(ReviewStatus) },
					example: ReviewStatus.Pending
				},
				{
					name: 'productId',
					in: 'query',
					description: 'Filter by product.',
					required: false,
					schema: { type: 'string', pattern: '^[a-f\\d]{24}$' }
				},
				{
					name: 'rating',
					in: 'query',
					description: 'Filter by exact rating.',
					required: false,
					schema: { type: 'integer', minimum: 1, maximum: 5 }
				}
			],
			responses: {
				'200': listResponse('Reviews retrieved successfully!', ref('Review')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/reviews/{id}': {
		patch: {
			tags: [TAG],
			summary: 'Edit my review',
			description:
				'**Customer (own review).** Editing sends the review back to `pending`, so it disappears from the public list until it is approved again.',
			operationId: 'updateReview',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateReviewRequest'),
						example: { rating: 4, comment: 'Still good after several washes.' }
					}
				}
			},
			responses: {
				'200': successResponse('Review updated successfully! It will be published once approved.', ref('Review')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': {
					description: 'Only the author can edit a review.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Delete a review',
			description: '**Customer (own review) or Admin.** The product rating aggregate is recalculated afterwards.',
			operationId: 'deleteReview',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('Review deleted successfully!', ref('Review')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/reviews/{id}/status': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Moderate a review',
			description:
				'**Admin.** Approves or rejects a review. Approving publishes it and recalculates the product `ratingAverage` and `ratingCount` from the approved reviews only.',
			operationId: 'moderateReview',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('ModerateReviewRequest'),
						example: { status: ReviewStatus.Approved, adminNote: 'Genuine purchase, approved.' }
					}
				}
			},
			responses: {
				'200': successResponse('Review approved successfully!', ref('Review')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	}
};
