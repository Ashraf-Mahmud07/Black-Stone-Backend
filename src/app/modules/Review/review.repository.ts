import { FilterQuery } from 'mongoose';
import { buildSort, isValidId, toObjectId } from '../../DB/dbHelpers';
import { TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import { ReviewStatus, TRatingSummary, TReview, TReviewFilters, TUpdateReviewPayload } from './review.interfaces';
import { Review, TReviewDocument } from './review.model';

const toReview = (doc: TReviewDocument): TReview => ({
	id: String(doc._id),
	productId: String(doc.product),
	userId: String(doc.user),
	customerName: doc.customerName,
	orderId: doc.order ? String(doc.order) : undefined,
	rating: doc.rating,
	comment: doc.comment,
	status: doc.status,
	isVerifiedPurchase: doc.isVerifiedPurchase ?? false,
	adminNote: doc.adminNote,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const buildQuery = (filters: TReviewFilters): FilterQuery<TReviewDocument> => {
	const query: FilterQuery<TReviewDocument> = {};
	if (filters.productId && isValidId(filters.productId)) query.product = filters.productId;
	if (filters.userId && isValidId(filters.userId)) query.user = filters.userId;
	if (filters.status) query.status = filters.status;
	if (filters.rating) query.rating = filters.rating;
	return query;
};

const create = async (payload: {
	productId: string;
	userId: string;
	customerName: string;
	orderId?: string;
	rating: number;
	comment: string;
	status: ReviewStatus;
	isVerifiedPurchase: boolean;
}): Promise<TReview> => {
	const created = await Review.create({
		product: payload.productId,
		user: payload.userId,
		customerName: payload.customerName,
		order: payload.orderId,
		rating: payload.rating,
		comment: payload.comment,
		status: payload.status,
		isVerifiedPurchase: payload.isVerifiedPurchase
	});
	return toReview(created.toObject() as TReviewDocument);
};

const findById = async (id: string): Promise<TReview | null> => {
	if (!isValidId(id)) return null;
	const found = await Review.findById(id).lean();
	return found ? toReview(found as TReviewDocument) : null;
};

const findByUserAndProduct = async (userId: string, productId: string): Promise<TReview | null> => {
	if (!isValidId(userId) || !isValidId(productId)) return null;
	const found = await Review.findOne({ user: userId, product: productId }).lean();
	return found ? toReview(found as TReviewDocument) : null;
};

const findMany = async (
	filters: TReviewFilters,
	pagination: TPaginationOptions
): Promise<TPaginatedResult<TReview>> => {
	const query = buildQuery(filters);
	const [rows, total] = await Promise.all([
		Review.find(query)
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Review.countDocuments(query)
	]);
	return { data: rows.map((row) => toReview(row as TReviewDocument)), meta: buildMeta(pagination, total) };
};

const update = async (
	id: string,
	payload: TUpdateReviewPayload & { status?: ReviewStatus }
): Promise<TReview | null> => {
	if (!isValidId(id)) return null;
	const updated = await Review.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
	return updated ? toReview(updated as TReviewDocument) : null;
};

const moderate = async (id: string, status: ReviewStatus, adminNote?: string): Promise<TReview | null> => {
	if (!isValidId(id)) return null;
	const updated = await Review.findByIdAndUpdate(id, { status, adminNote }, { new: true }).lean();
	return updated ? toReview(updated as TReviewDocument) : null;
};

const remove = async (id: string): Promise<boolean> => {
	if (!isValidId(id)) return false;
	const result = await Review.deleteOne({ _id: id });
	return result.deletedCount === 1;
};

/** Aggregated rating over approved reviews only. */
const getRatingSummary = async (productId: string): Promise<TRatingSummary> => {
	if (!isValidId(productId)) return { ratingAverage: 0, ratingCount: 0 };

	const rows = await Review.aggregate<{ average: number; count: number }>([
		{ $match: { product: toObjectId(productId), status: ReviewStatus.Approved } },
		{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
	]);

	const summary = rows[0];
	return {
		ratingAverage: summary ? Math.round(summary.average * 10) / 10 : 0,
		ratingCount: summary?.count ?? 0
	};
};

const count = async (filters: TReviewFilters = {}): Promise<number> => Review.countDocuments(buildQuery(filters));

const ReviewRepository = {
	create,
	findById,
	findByUserAndProduct,
	findMany,
	update,
	moderate,
	remove,
	getRatingSummary,
	count
};

export default ReviewRepository;
