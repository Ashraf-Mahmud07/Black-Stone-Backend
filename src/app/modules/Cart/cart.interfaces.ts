import { TImage } from '../../interface/common';

/**
 * Only identifiers and quantities are persisted. Prices are always recalculated from the
 * product data so a stale or tampered cart can never influence what a customer pays.
 */
export type TCartItem = {
	productId: string;
	variantId?: string;
	quantity: number;
	addedAt?: Date;
};

export type TCart = {
	id: string;
	userId: string;
	items: TCartItem[];
	updatedAt?: Date;
};

/** Cart item enriched with trusted product data - what the API actually returns. */
export type TCartItemView = {
	productId: string;
	variantId?: string;
	name: string;
	slug: string;
	sku: string;
	image?: TImage;
	variantLabel?: string;
	quantity: number;
	listPrice: number;
	unitPrice: number;
	lineTotal: number;
	availableStock: number;
	isAvailable: boolean;
	issue?: string;
};

export type TCartView = {
	items: TCartItemView[];
	itemCount: number;
	totals: {
		subtotal: number;
		discount: number;
		itemsTotal: number;
	};
	hasIssues: boolean;
};

export type TAddCartItemPayload = {
	productId: string;
	variantId?: string;
	quantity: number;
};

export type TUpdateCartItemPayload = {
	quantity: number;
};
