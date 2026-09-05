import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TAuthUser, UserRole } from '../../interface/auth';
import { TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import OrderRepository from '../Order/order.repository';
import ProductRepository from '../Product/product.repository';
import {
	ReviewStatus,
	TCreateReviewPayload,
	TModerateReviewPayload,
	TReview,
	TReviewFilters,
	TUpdateReviewPayload
} from './review.interfaces';
import ReviewRepository from './review.repository';

/** Keeps the denormalised product rating in sync with the approved reviews. */
const refreshProductRating = async (productId: string): Promise<void> => {
	const summary = await ReviewRepository.getRatingSummary(productId);
	await ProductRepository.updateRating(productId, summary.ratingAverage, summary.ratingCount);
};

const createReview = async (payload: TCreateReviewPayload, authUser: TAuthUser): Promise<TReview> => {
	const product = await ProductRepository.findById(payload.productId);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}

	const existing = await ReviewRepository.findByUserAndProduct(authUser.id, payload.productId);
	if (existing) {
		throw new AppError(httpStatus.CONFLICT, 'You have already reviewed this product!');
	}

	const isVerifiedPurchase = await OrderRepository.hasDeliveredPurchase(authUser.id, payload.productId);

	const review = await ReviewRepository.create({
		productId: payload.productId,
		userId: authUser.id,
		customerName: authUser.name ?? 'Customer',
		orderId: payload.orderId,
		rating: payload.rating,
		comment: payload.comment,
		status: ReviewStatus.Pending,
		isVerifiedPurchase
	});

	return review;
};

/** Public listing - only approved reviews are ever returned. */
const getProductReviews = async (
	productId: string,
	query: Record<string, unknown>
): Promise<TPaginatedResult<TReview>> =>
	ReviewRepository.findMany({ productId, status: ReviewStatus.Approved }, calculatePagination(query));

const getMyReviews = async (userId: string, query: Record<string, unknown>): Promise<TPaginatedResult<TReview>> =>
	ReviewRepository.findMany({ userId }, calculatePagination(query));

const getReviews = async (query: Record<string, unknown>): Promise<TPaginatedResult<TReview>> => {
	const filters: TReviewFilters = {
		status: typeof query.status === 'string' ? (query.status as ReviewStatus) : undefined,
		productId: typeof query.productId === 'string' ? query.productId : undefined,
		rating: query.rating ? Number(query.rating) : undefined
	};
	return ReviewRepository.findMany(filters, calculatePagination(query));
};

const updateReview = async (id: string, payload: TUpdateReviewPayload, authUser: TAuthUser): Promise<TReview> => {
	const review = await ReviewRepository.findById(id);
	if (!review) {
		throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
	}
	if (review.userId !== authUser.id) {
		throw new AppError(httpStatus.FORBIDDEN, 'You can only edit your own review!');
	}

	// an edited review has to be moderated again
	const updated = await ReviewRepository.update(id, { ...payload, status: ReviewStatus.Pending });
	await refreshProductRating(review.productId);
	return updated as TReview;
};

const moderateReview = async (id: string, payload: TModerateReviewPayload): Promise<TReview> => {
	const review = await ReviewRepository.findById(id);
	if (!review) {
		throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
	}

	const updated = await ReviewRepository.moderate(id, payload.status, payload.adminNote);
	await refreshProductRating(review.productId);
	return updated as TReview;
};

const deleteReview = async (id: string, authUser: TAuthUser): Promise<TReview> => {
	const review = await ReviewRepository.findById(id);
	if (!review) {
		throw new AppError(httpStatus.NOT_FOUND, 'Review not found!');
	}
	if (authUser.role !== UserRole.Admin && review.userId !== authUser.id) {
		throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own review!');
	}

	await ReviewRepository.remove(id);
	await refreshProductRating(review.productId);
	return review;
};

const ReviewServices = {
	createReview,
	getProductReviews,
	getMyReviews,
	getReviews,
	updateReview,
	moderateReview,
	deleteReview
};

export default ReviewServices;
