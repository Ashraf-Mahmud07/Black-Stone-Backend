export enum ReviewStatus {
	Pending = 'pending',
	Approved = 'approved',
	Rejected = 'rejected'
}

export type TReview = {
	id: string;
	productId: string;
	userId: string;
	customerName: string;
	orderId?: string;
	rating: number;
	comment: string;
	status: ReviewStatus;
	isVerifiedPurchase: boolean;
	adminNote?: string;
	createdAt?: Date;
	updatedAt?: Date;
};

export type TCreateReviewPayload = {
	productId: string;
	orderId?: string;
	rating: number;
	comment: string;
};

export type TUpdateReviewPayload = {
	rating?: number;
	comment?: string;
};

export type TModerateReviewPayload = {
	status: ReviewStatus;
	adminNote?: string;
};

export type TReviewFilters = {
	productId?: string;
	userId?: string;
	status?: ReviewStatus;
	rating?: number;
};

export type TRatingSummary = {
	ratingAverage: number;
	ratingCount: number;
};
