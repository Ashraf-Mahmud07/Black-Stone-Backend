import { TImage } from '../../interface/common';

export type TCategory = {
	id: string;
	name: string;
	slug: string;
	description?: string;
	image?: TImage;
	sortOrder: number;
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

/** Lightweight category reference embedded in product responses. */
export type TCategorySummary = Pick<TCategory, 'id' | 'name' | 'slug'>;

export type TCreateCategoryPayload = {
	name: string;
	slug?: string;
	description?: string;
	image?: TImage;
	sortOrder?: number;
	isActive?: boolean;
};

export type TUpdateCategoryPayload = Partial<TCreateCategoryPayload>;

export type TCategoryFilters = {
	search?: string;
	isActive?: boolean;
};
