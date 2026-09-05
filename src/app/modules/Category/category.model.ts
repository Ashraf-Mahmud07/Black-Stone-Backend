import { Schema, model } from 'mongoose';
import { TImage } from '../../interface/common';

export type TCategoryDocument = {
	_id?: string;
	name: string;
	slug: string;
	description?: string;
	image?: TImage;
	sortOrder: number;
	isActive: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

export const ImageSchema = new Schema<TImage>(
	{
		url: { type: String, required: [true, 'Image url is required!'] },
		key: { type: String },
		alt: { type: String },
		isPrimary: { type: Boolean, default: false }
	},
	{ _id: false }
);

const categorySchema = new Schema<TCategoryDocument>(
	{
		name: {
			type: String,
			required: [true, 'Category name is required!'],
			trim: true
		},
		slug: {
			type: String,
			required: [true, 'Category slug is required!'],
			unique: true,
			lowercase: true,
			trim: true
		},
		description: { type: String },
		image: ImageSchema,
		sortOrder: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export const Category = model<TCategoryDocument>('Category', categorySchema);
