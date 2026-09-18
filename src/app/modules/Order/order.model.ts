import { Schema, Types, model } from 'mongoose';
import { ImageSchema } from '../Category/category.model';
import {
	OrderStatus,
	PaymentMethod,
	PaymentStatus,
	TCustomerSnapshot,
	TOrderItem,
	TOrderStatusHistoryEntry,
	TPricingHistoryEntry,
	TShippingAddress
} from './order.interfaces';

export type TOrderDocument = {
	_id?: unknown;
	orderNumber: string;
	user?: Types.ObjectId;
	customer: TCustomerSnapshot;
	shippingAddress: TShippingAddress;
	items: TOrderItem[];
	subtotal: number;
	discount: number;
	manualDiscount: number;
	deliveryCharge: number;
	deliveryChargeOverridden: boolean;
	deliveryArea?: string;
	total: number;
	paymentMethod: PaymentMethod;
	paymentStatus: PaymentStatus;
	payment?: Types.ObjectId;
	status: OrderStatus;
	statusHistory: TOrderStatusHistoryEntry[];
	pricingHistory: TPricingHistoryEntry[];
	idempotencyKey?: string;
	duplicateFingerprint?: string;
	customerNotes?: string;
	adminNotes?: string;
	stockRestored: boolean;
	cancellationReason?: string;
	confirmedAt?: Date;
	deliveredAt?: Date;
	cancelledAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
};

const CustomerSchema = new Schema<TCustomerSnapshot>(
	{
		userId: { type: String },
		name: { type: String, required: [true, 'Customer name is required!'] },
		phone: { type: String, required: [true, 'Customer phone is required!'] },
		email: { type: String },
		isGuest: { type: Boolean, default: true }
	},
	{ _id: false }
);

const ShippingAddressSchema = new Schema<TShippingAddress>(
	{
		name: { type: String, required: [true, 'Recipient name is required!'] },
		phone: { type: String, required: [true, 'Recipient phone is required!'] },
		email: { type: String },
		address: { type: String, required: [true, 'Address is required!'] },
		deliveryNotes: { type: String }
	},
	{ _id: false }
);

const ProductSnapshotSchema = new Schema(
	{
		productId: { type: String, required: true },
		name: { type: String, required: true },
		slug: { type: String, required: true },
		sku: { type: String, required: true },
		image: ImageSchema,
		specifications: {
			type: [{ key: String, value: String }],
			default: []
		}
	},
	{ _id: false }
);

const VariantSnapshotSchema = new Schema(
	{
		variantId: { type: String, required: true },
		sku: { type: String, required: true },
		label: { type: String },
		color: { type: String },
		size: { type: String },
		design: { type: String },
		attributes: { type: Map, of: String }
	},
	{ _id: false }
);

const OrderItemSchema = new Schema<TOrderItem>(
	{
		product: { type: ProductSnapshotSchema, required: true },
		variant: { type: VariantSnapshotSchema },
		quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1!'] },
		listPrice: { type: Number, required: true, min: 0 },
		unitPrice: { type: Number, required: true, min: 0 },
		discount: { type: Number, default: 0, min: 0 },
		subtotal: { type: Number, required: true, min: 0 }
	},
	{ _id: false }
);

const StatusHistorySchema = new Schema<TOrderStatusHistoryEntry>(
	{
		status: { type: String, enum: Object.values(OrderStatus), required: true },
		at: { type: Date, default: Date.now },
		byId: { type: String },
		byRole: { type: String },
		note: { type: String }
	},
	{ _id: false }
);

const PricingHistorySchema = new Schema<TPricingHistoryEntry>(
	{
		at: { type: Date, default: Date.now },
		byId: { type: String },
		byRole: { type: String },
		previousTotal: { type: Number, required: true, min: 0 },
		newTotal: { type: Number, required: true, min: 0 },
		manualDiscount: { type: Number, required: true, min: 0 },
		deliveryCharge: { type: Number, required: true, min: 0 },
		note: { type: String }
	},
	{ _id: false }
);

const orderSchema = new Schema<TOrderDocument>(
	{
		orderNumber: {
			type: String,
			required: [true, 'Order number is required!'],
			unique: true,
			uppercase: true,
			trim: true
		},
		user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
		customer: { type: CustomerSchema, required: true },
		shippingAddress: { type: ShippingAddressSchema, required: true },
		items: { type: [OrderItemSchema], required: true },
		subtotal: { type: Number, required: true, min: 0 },
		discount: { type: Number, default: 0, min: 0 },
		manualDiscount: { type: Number, default: 0, min: [0, 'Manual discount cannot be negative!'] },
		deliveryCharge: { type: Number, default: 0, min: 0 },
		deliveryChargeOverridden: { type: Boolean, default: false },
		deliveryArea: { type: String },
		total: { type: Number, required: true, min: 0 },
		paymentMethod: {
			type: String,
			enum: Object.values(PaymentMethod),
			required: [true, 'Payment method is required!']
		},
		paymentStatus: {
			type: String,
			enum: Object.values(PaymentStatus),
			default: PaymentStatus.Pending,
			index: true
		},
		payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
		status: {
			type: String,
			enum: Object.values(OrderStatus),
			default: OrderStatus.Pending,
			index: true
		},
		statusHistory: { type: [StatusHistorySchema], default: [] },
		pricingHistory: { type: [PricingHistorySchema], default: [] },
		// the unique index is what actually makes a double submission impossible
		idempotencyKey: { type: String },
		duplicateFingerprint: { type: String },
		customerNotes: { type: String },
		adminNotes: { type: String },
		stockRestored: { type: Boolean, default: false },
		cancellationReason: { type: String },
		confirmedAt: { type: Date },
		deliveredAt: { type: Date },
		cancelledAt: { type: Date }
	},
	{ timestamps: true }
);

orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ duplicateFingerprint: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<TOrderDocument>('Order', orderSchema);
