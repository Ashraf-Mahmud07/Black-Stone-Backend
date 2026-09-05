import { Schema, Types, model } from 'mongoose';
import { ReviewStatus } from './review.interfaces';

export type TReviewDocument = {
	_id?: unknown;
	product: Types.ObjectId;
	user: Types.ObjectId;
	customerName: string;
	order?: Types.ObjectId;
	rating: number;
	comment: string;
	status: ReviewStatus;
	isVerifiedPurchase: boolean;
	adminNote?: string;
	createdAt?: Date;
	updatedAt?: Date;
};

const reviewSchema = new Schema<TReviewDocument>(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: [true, 'Product is required!'],
			index: true
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required!']
		},
		customerName: { type: String, required: true },
		order: { type: Schema.Types.ObjectId, ref: 'Order' },
		rating: {
			type: Number,
			required: [true, 'Rating is required!'],
			min: [1, 'Rating must be at least 1!'],
			max: [5, 'Rating cannot be more than 5!']
		},
		comment: {
			type: String,
			required: [true, 'Comment is required!'],
			trim: true
		},
		status: {
			type: String,
			enum: Object.values(ReviewStatus),
			default: ReviewStatus.Pending,
			index: true
		},
		isVerifiedPurchase: { type: Boolean, default: false },
		adminNote: { type: String }
	},
	{ timestamps: true }
);

// one review per customer per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model<TReviewDocument>('Review', reviewSchema);
