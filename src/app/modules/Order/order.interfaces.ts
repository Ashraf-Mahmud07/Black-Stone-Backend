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
	addressLine: string;
	area?: string;
	city: string;
	district?: string;
	postalCode?: string;
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

export type TOrder = {
	id: string;
	orderNumber: string;
	userId?: string;
	customer: TCustomerSnapshot;
	shippingAddress: TShippingAddress;
	items: TOrderItem[];
	subtotal: number;
	discount: number;
	deliveryCharge: number;
	deliveryArea?: string;
	total: number;
	paymentMethod: PaymentMethod;
	paymentStatus: PaymentStatus;
	paymentId?: string;
	status: OrderStatus;
	statusHistory: TOrderStatusHistoryEntry[];
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
