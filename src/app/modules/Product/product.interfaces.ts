import { TImage } from '../../interface/common';
import { TCategorySummary } from '../Category/category.interfaces';

export enum ProductStatus {
	Active = 'active',
	Inactive = 'inactive',
	Draft = 'draft'
}

export type TSpecification = {
	key: string;
	value: string;
};

export type TSeo = {
	title?: string;
	description?: string;
	keywords?: string[];
};

export type TProductVariant = {
	id: string;
	sku: string;
	/** Colour name in English, e.g. `Black`. */
	color?: string;
	/** Colour name in Bangla, e.g. `কালো`. Optional - falls back to `color` on the client. */
	colorBn?: string;
	size?: string;
	design?: string;
	/** Free-form extra attributes (fabric, work type, ...). */
	attributes?: Record<string, string>;
	/** Optional variant level price - falls back to the product price when absent. */
	price?: number;
	discountPrice?: number;
	stock: number;
	/** Primary image for this colour. Absent when the variant has no image of its own. */
	image?: TImage;
	/** Optional extra images for this colour, shown as a gallery on the PDP. */
	images: TImage[];
	/**
	 * What the storefront should render for this variant: its own image when it has one,
	 * otherwise the product's primary image. Derived - never stored.
	 */
	displayImage?: TImage;
	/** False when `displayImage` came from the product rather than the variant. */
	hasOwnImage: boolean;
	isActive: boolean;
};

export type TProduct = {
	id: string;
	name: string;
	slug: string;
	description: string;
	shortDescription?: string;
	categoryId: string;
	category?: TCategorySummary;
	images: TImage[];
	/** Product videos (Cloudinary when that provider is configured). */
	videos: TImage[];
	price: number;
	discountPrice?: number;
	sku: string;
	variants: TProductVariant[];
	specifications: TSpecification[];
	/** Total stock. When variants exist this is the sum of all variant stock. */
	stock: number;
	status: ProductStatus;
	featured: boolean;
	tags: string[];
	seo?: TSeo;
	ratingAverage: number;
	ratingCount: number;
	isDeleted: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

export type TVariantPayload = Omit<TProductVariant, 'id' | 'isActive' | 'images' | 'displayImage' | 'hasOwnImage'> & {
	isActive?: boolean;
	images?: TImage[];
};

export type TCreateProductPayload = {
	name: string;
	slug?: string;
	description: string;
	shortDescription?: string;
	categoryId: string;
	images?: TImage[];
	price: number;
	discountPrice?: number;
	sku?: string;
	variants?: TVariantPayload[];
	specifications?: TSpecification[];
	stock?: number;
	status?: ProductStatus;
	featured?: boolean;
	tags?: string[];
	seo?: TSeo;
};

export type TUpdateProductPayload = Partial<TCreateProductPayload>;

export type TProductFilters = {
	search?: string;
	categoryId?: string;
	categorySlug?: string;
	minPrice?: number;
	maxPrice?: number;
	featured?: boolean;
	status?: ProductStatus;
	tags?: string[];
	inStock?: boolean;
	/** Only admins may list non active products. */
	includeAllStatuses?: boolean;
};

/** A single product/variant quantity used by cart, checkout and inventory operations. */
export type TStockLine = {
	productId: string;
	variantId?: string;
	quantity: number;
};

/**
 * A cart/checkout line resolved against trusted product data.
 * Prices always come from the database, never from the client payload.
 */
export type TResolvedLine = {
	product: TProduct;
	variant?: TProductVariant;
	quantity: number;
	listPrice: number;
	unitPrice: number;
	availableStock: number;
};
