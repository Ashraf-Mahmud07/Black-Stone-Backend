import { TImage } from '../../interface/common';
import { DeliveryArea } from '../Delivery/delivery.interfaces';
import { TSpecification } from '../Product/product.interfaces';

export enum OrderStatus {
	Pending = 'pending',
	Confirmed = 'confirmed',
	Processing = 'processing',
	Shipped = 'shipped',
	Delivered = 'delivered',
	Cancelled = 'cancelled'
}

/**
 * The store is cash on delivery only: every order is created as `cod` server side.
 * The wallet values stay in the enum so historical orders keep deserialising and online
 * payment can be switched back on later without a migration.
 */
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
	/** Set when the client sent an Idempotency-Key, or synthesised for the duplicate window. */
	idempotencyKey?: string;
	/** Hash of phone + area + basket, used to spot a double submission. */
	duplicateFingerprint?: string;
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
 * Shipping address as the client sends it. `name` and `phone` are optional - the server
 * copies them from `customer`, so checkout only has to collect them once.
 */
export type TCheckoutAddressInput = Omit<TShippingAddress, 'name' | 'phone'> & {
	name?: string;
	phone?: string;
};

/**
 * `source: 'cart'` uses the logged-in customer's server side cart.
 * `source: 'direct'` powers Buy Now and guest checkout with an explicit item list.
 *
 * Required inputs: `customer.name`, `customer.phone`, `shippingAddress.address`, `deliveryArea`.
 */
export type TCheckoutPayload = {
	source?: 'cart' | 'direct';
	items?: TCheckoutItemInput[];
	customer: TCheckoutCustomerInput;
	shippingAddress: TCheckoutAddressInput;
	deliveryArea: DeliveryArea;
	/** Accepted but ignored - the server always stores cash on delivery. */
	paymentMethod?: PaymentMethod;
	/** Compared against the server total and logged on mismatch. Never used for pricing. */
	expectedTotal?: number;
	/** Deprecated: customers no longer send notes. Still stored when present. */
	customerNotes?: string;
	/** From the `Idempotency-Key` request header. */
	idempotencyKey?: string;
};

export type TCheckoutPreviewPayload = {
	source?: 'cart' | 'direct';
	items?: TCheckoutItemInput[];
	deliveryArea?: DeliveryArea;
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
