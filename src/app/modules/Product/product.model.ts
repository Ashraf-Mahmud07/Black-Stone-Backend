import { Schema, Types, model } from 'mongoose';
import { TImage } from '../../interface/common';
import { ImageSchema } from '../Category/category.model';
import { ProductStatus, TSeo, TSpecification } from './product.interfaces';

export type TProductVariantDocument = {
	_id?: Types.ObjectId;
	sku: string;
	color?: string;
	size?: string;
	design?: string;
	attributes?: Record<string, string>;
	price?: number;
	discountPrice?: number;
	stock: number;
	image?: TImage;
	isActive: boolean;
};

export type TProductDocument = {
	_id?: unknown;
	name: string;
	slug: string;
	description: string;
	shortDescription?: string;
	category: Types.ObjectId | { _id: unknown; name: string; slug: string };
	images: TImage[];
	price: number;
	discountPrice?: number;
	sku: string;
	variants: TProductVariantDocument[];
	specifications: TSpecification[];
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

const SpecificationSchema = new Schema<TSpecification>(
	{
		key: { type: String, required: [true, 'Specification key is required!'] },
		value: { type: String, required: [true, 'Specification value is required!'] }
	},
	{ _id: false }
);

const SeoSchema = new Schema<TSeo>(
	{
		title: { type: String },
		description: { type: String },
		keywords: { type: [String], default: [] }
	},
	{ _id: false }
);

const VariantSchema = new Schema<TProductVariantDocument>({
	sku: {
		type: String,
		required: [true, 'Variant SKU is required!'],
		trim: true
	},
	color: { type: String, trim: true },
	size: { type: String, trim: true },
	design: { type: String, trim: true },
	attributes: { type: Map, of: String },
	price: { type: Number, min: [0, 'Price cannot be negative!'] },
	discountPrice: { type: Number, min: [0, 'Discount price cannot be negative!'] },
	stock: {
		type: Number,
		required: [true, 'Variant stock is required!'],
		min: [0, 'Stock cannot be negative!'],
		default: 0
	},
	image: ImageSchema,
	isActive: { type: Boolean, default: true }
});

const productSchema = new Schema<TProductDocument>(
	{
		name: {
			type: String,
			required: [true, 'Product name is required!'],
			trim: true
		},
		slug: {
			type: String,
			required: [true, 'Product slug is required!'],
			unique: true,
			lowercase: true,
			trim: true
		},
		description: {
			type: String,
			required: [true, 'Product description is required!']
		},
		shortDescription: { type: String },
		category: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			required: [true, 'Product category is required!'],
			index: true
		},
		images: { type: [ImageSchema], default: [] },
		price: {
			type: Number,
			required: [true, 'Product price is required!'],
			min: [0, 'Price cannot be negative!']
		},
		discountPrice: {
			type: Number,
			min: [0, 'Discount price cannot be negative!']
		},
		sku: {
			type: String,
			required: [true, 'Product SKU is required!'],
			unique: true,
			uppercase: true,
			trim: true
		},
		variants: { type: [VariantSchema], default: [] },
		specifications: { type: [SpecificationSchema], default: [] },
		stock: {
			type: Number,
			default: 0,
			min: [0, 'Stock cannot be negative!']
		},
		status: {
			type: String,
			enum: Object.values(ProductStatus),
			default: ProductStatus.Draft,
			index: true
		},
		featured: { type: Boolean, default: false },
		tags: { type: [String], default: [] },
		seo: SeoSchema,
		ratingAverage: { type: Number, default: 0 },
		ratingCount: { type: Number, default: 0 },
		isDeleted: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

productSchema.index({ name: 'text', tags: 'text', shortDescription: 'text' });
productSchema.index({ status: 1, featured: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ 'variants.sku': 1 });

export const Product = model<TProductDocument>('Product', productSchema);
