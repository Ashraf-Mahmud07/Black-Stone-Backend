import { Schema, Types, model } from 'mongoose';

export type TCartItemDocument = {
	product: Types.ObjectId;
	variantId?: Types.ObjectId;
	quantity: number;
	addedAt?: Date;
};

export type TCartDocument = {
	_id?: unknown;
	user: Types.ObjectId;
	items: TCartItemDocument[];
	createdAt?: Date;
	updatedAt?: Date;
};

const CartItemSchema = new Schema<TCartItemDocument>(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: [true, 'Product is required!']
		},
		variantId: { type: Schema.Types.ObjectId },
		quantity: {
			type: Number,
			required: [true, 'Quantity is required!'],
			min: [1, 'Quantity must be at least 1!']
		},
		addedAt: { type: Date, default: Date.now }
	},
	{ _id: false }
);

const cartSchema = new Schema<TCartDocument>(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'User is required!'],
			unique: true
		},
		items: { type: [CartItemSchema], default: [] }
	},
	{ timestamps: true }
);

export const Cart = model<TCartDocument>('Cart', cartSchema);
