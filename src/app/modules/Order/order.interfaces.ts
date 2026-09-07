import { TImage } from '../../interface/common';
import { TSpecification } from '../Product/product.interfaces';

export enum OrderStatus {
	Pending = 'pending',
	Confirmed = 'confirmed',
	Processing = 'processing',
	Shipped = 'shipped',
	Delivered = 'delivered',
	Cancelled = 'cancelled'
}

export enum PaymentMethod {
	Bkash = 'bkash',
	Nagad = 'nagad',
	CashOnDelivery = 'cod'
}

/** Payment status is tracked completely independently from the order status. */
export enum PaymentStatus {
	Pending = 'pending',
	Submitted = 'submitted',
	Verified = 'verified',
	Rejected = 'rejected',
	Failed = 'failed',
	Refunded = 'refunded'
}

export type TCustomerSnapshot = {
	userId?: string;
	name: string;
	phone: string;
	email?: string;
	isGuest: boolean;
};

export type TShippingAddress = {
	name: string;
	phone: string;
	email?: string;
	/** Full delivery address as a single free-form line. */
	address: string;
	deliveryNotes?: string;
};

/** Frozen copy of the product at the moment the order was placed. */
export type TProductSnapshot = {
	productId: string;
	name: string;
	slug: string;
	sku: string;
	image?: TImage;
	specifications?: TSpecification[];
};

export type TVariantSnapshot = {
	variantId: string;
	sku: string;
	label?: string;
	color?: string;
	size?: string;
	design?: string;
	attributes?: Record<string, string>;
};

export type TOrderItem = {
	product: TProductSnapshot;
	variant?: TVariantSnapshot;
	quantity: number;
	/** Price before the discount. */
	listPrice: number;
	/** Price actually charged per unit. */
	unitPrice: number;
	discount: number;
	subtotal: number;
};

export type TOrderStatusHistoryEntry = {
	status: OrderStatus;
	at: Date;
	byId?: string;
	byRole?: string;
	note?: string;
};

/**
 * One admin price adjustment. Kept separate from `statusHistory` because that entry is
 * status centric - its `status` is required - and a pricing change moves no status.
 */
export type TPricingHistoryEntry = {
	at: Date;
	byId?: string;
	byRole?: string;
	previousTotal: number;
	newTotal: number;
	manualDiscount: number;
	deliveryCharge: number;
	note?: string;
};

export type TOrder = {
	id: string;
	orderNumber: string;
	userId?: string;
	customer: TCustomerSnapshot;
	shippingAddress: TShippingAddress;
	items: TOrderItem[];
	subtotal: number;
	/** Item level discount, derived from the catalogue at checkout. Never set by hand. */
	discount: number;
	/** Absolute amount an admin negotiated off this order, on top of `discount`. */
	manualDiscount: number;
	deliveryCharge: number;
	/** True once an admin set the charge for this order, so a later recalculation keeps it. */
	deliveryChargeOverridden: boolean;
	deliveryArea?: string;
	/** total = subtotal - discount - manualDiscount + deliveryCharge */
	total: number;
	paymentMethod: PaymentMethod;
	paymentStatus: PaymentStatus;
	paymentId?: string;
	status: OrderStatus;
	statusHistory: TOrderStatusHistoryEntry[];
	pricingHistory: TPricingHistoryEntry[];
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

export type TCheckoutItemInput = {
	productId: string;
	variantId?: string;
	quantity: number;
};

export type TCheckoutCustomerInput = {
	name: string;
	phone: string;
	email?: string;
};

/**
 * `source: 'cart'` uses the logged-in customer's server side cart.
 * `source: 'direct'` powers Buy Now and guest checkout with an explicit item list.
 */
export type TCheckoutPayload = {
	source?: 'cart' | 'direct';
	items?: TCheckoutItemInput[];
	customer: TCheckoutCustomerInput;
	shippingAddress: TShippingAddress;
	deliveryArea?: string;
	paymentMethod: PaymentMethod;
	customerNotes?: string;
};

export type TCheckoutPreviewPayload = {
	source?: 'cart' | 'direct';
	items?: TCheckoutItemInput[];
	deliveryArea?: string;
};

export type TCheckoutSummary = {
	items: Array<{
		productId: string;
		variantId?: string;
		name: string;
		image?: TImage;
		variantLabel?: string;
		quantity: number;
		listPrice: number;
		unitPrice: number;
		subtotal: number;
	}>;
	subtotal: number;
	discount: number;
	deliveryCharge: number;
	deliveryArea?: string;
	isFreeDelivery: boolean;
	total: number;
};

export type TPaymentInstructions = {
	method: PaymentMethod;
	merchantNumber?: string;
	accountType?: string;
	payableAmount: number;
	instructions: string[];
};

export type TOrderFilters = {
	search?: string;
	status?: OrderStatus;
	paymentStatus?: PaymentStatus;
	paymentMethod?: PaymentMethod;
	userId?: string;
	from?: Date;
	to?: Date;
};

export type TUpdateOrderStatusPayload = {
	status: OrderStatus;
	note?: string;
};

/**
 * Admin price adjustment. Every field is optional but at least one of `manualDiscount`,
 * `deliveryCharge` or `resetDelivery` must be present. No total is ever accepted.
 */
export type TAdjustOrderPricingPayload = {
	manualDiscount?: number;
	deliveryCharge?: number;
	resetDelivery?: boolean;
	note?: string;
};

export type TOrderPricingResult = {
	order: TOrder;
	/**
	 * Amount owed back to the customer: the verified payment minus the new total.
	 * 0 whenever nothing was overpaid.
	 */
	refundDue: number;
};
