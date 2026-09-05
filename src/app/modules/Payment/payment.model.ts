import { Schema, Types, model } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../Order/order.interfaces';
import { TPaymentHistoryEntry } from './payment.interfaces';

export type TPaymentDocument = {
	_id?: unknown;
	order: Types.ObjectId;
	orderNumber: string;
	method: PaymentMethod;
	amount: number;
	status: PaymentStatus;
	transactionId?: string;
	senderNumber?: string;
	screenshotKey?: string;
	submittedAt?: Date;
	verifiedAt?: Date;
	verifiedBy?: string;
	rejectionReason?: string;
	history: TPaymentHistoryEntry[];
	createdAt?: Date;
	updatedAt?: Date;
};

const HistorySchema = new Schema<TPaymentHistoryEntry>(
	{
		status: { type: String, enum: Object.values(PaymentStatus), required: true },
		at: { type: Date, default: Date.now },
		byId: { type: String },
		byRole: { type: String },
		note: { type: String }
	},
	{ _id: false }
);

const paymentSchema = new Schema<TPaymentDocument>(
	{
		order: {
			type: Schema.Types.ObjectId,
			ref: 'Order',
			required: [true, 'Order is required!'],
			unique: true
		},
		orderNumber: { type: String, required: true, uppercase: true, index: true },
		method: { type: String, enum: Object.values(PaymentMethod), required: true },
		amount: { type: Number, required: true, min: 0 },
		status: {
			type: String,
			enum: Object.values(PaymentStatus),
			default: PaymentStatus.Pending,
			index: true
		},
		transactionId: { type: String, trim: true, uppercase: true },
		senderNumber: { type: String, trim: true },
		screenshotKey: { type: String },
		submittedAt: { type: Date },
		verifiedAt: { type: Date },
		verifiedBy: { type: String },
		rejectionReason: { type: String },
		history: { type: [HistorySchema], default: [] }
	},
	{ timestamps: true }
);

// the same transaction id must not be reused across orders
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ createdAt: -1 });

export const Payment = model<TPaymentDocument>('Payment', paymentSchema);
