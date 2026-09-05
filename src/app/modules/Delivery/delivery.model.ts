import { Schema, model } from 'mongoose';
import { TDeliveryArea } from './delivery.interfaces';

export type TDeliverySettingDocument = {
	_id?: unknown;
	/** Only one settings document exists - guarded by this unique key. */
	singletonKey: string;
	defaultCharge: number;
	freeDeliveryEnabled: boolean;
	freeDeliveryThreshold: number;
	areas: TDeliveryArea[];
	note?: string;
	createdAt?: Date;
	updatedAt?: Date;
};

const AreaSchema = new Schema<TDeliveryArea>(
	{
		key: { type: String, required: [true, 'Area key is required!'], lowercase: true, trim: true },
		name: { type: String, required: [true, 'Area name is required!'], trim: true },
		charge: { type: Number, required: [true, 'Delivery charge is required!'], min: [0, 'Charge cannot be negative!'] },
		estimatedDays: { type: String },
		isActive: { type: Boolean, default: true }
	},
	{ _id: false }
);

const deliverySettingSchema = new Schema<TDeliverySettingDocument>(
	{
		singletonKey: { type: String, default: 'default', unique: true },
		defaultCharge: { type: Number, required: true, min: [0, 'Charge cannot be negative!'] },
		freeDeliveryEnabled: { type: Boolean, default: false },
		freeDeliveryThreshold: { type: Number, default: 0, min: [0, 'Threshold cannot be negative!'] },
		areas: { type: [AreaSchema], default: [] },
		note: { type: String }
	},
	{ timestamps: true }
);

export const DeliverySetting = model<TDeliverySettingDocument>('DeliverySetting', deliverySettingSchema);
