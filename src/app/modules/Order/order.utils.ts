import config from '../../config';
import { uniqueSuffix } from '../../utils/slugify';
import { OrderStatus, PaymentMethod, PaymentStatus, TPaymentInstructions } from './order.interfaces';

/** Allowed order status transitions. Anything not listed here is rejected. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	[OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
	[OrderStatus.Confirmed]: [OrderStatus.Processing, OrderStatus.Cancelled],
	[OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
	[OrderStatus.Shipped]: [OrderStatus.Delivered],
	[OrderStatus.Delivered]: [],
	[OrderStatus.Cancelled]: []
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
	ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

/** A customer may only cancel while the order has not been handed over to delivery. */
export const canCustomerCancel = (status: OrderStatus): boolean =>
	status === OrderStatus.Pending || status === OrderStatus.Confirmed;

/** Stock is released back to inventory for every cancellation. */
export const shouldRestoreStock = (to: OrderStatus): boolean => to === OrderStatus.Cancelled;

export const generateOrderNumber = (date = new Date()): string => {
	const yy = String(date.getFullYear()).slice(-2);
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `BS-${yy}${mm}${dd}-${uniqueSuffix(6).toUpperCase()}`;
};

export const isManualPaymentMethod = (method: PaymentMethod): boolean =>
	method === PaymentMethod.Bkash || method === PaymentMethod.Nagad;

/**
 * Payment instructions shown to the customer right after the order is created.
 * Merchant numbers always come from the environment configuration.
 */
export const buildPaymentInstructions = (method: PaymentMethod, payableAmount: number): TPaymentInstructions => {
	if (method === PaymentMethod.CashOnDelivery) {
		return {
			method,
			payableAmount,
			instructions: [
				`Please keep ${payableAmount} BDT ready for the delivery agent.`,
				'Your order will be confirmed by our team over the phone.'
			]
		};
	}

	const isBkash = method === PaymentMethod.Bkash;
	const merchantNumber = isBkash ? config.payment.bkash_merchant_number : config.payment.nagad_merchant_number;
	const accountType = isBkash ? config.payment.bkash_account_type : config.payment.nagad_account_type;
	const walletName = isBkash ? 'bKash' : 'Nagad';

	return {
		method,
		merchantNumber,
		accountType,
		payableAmount,
		instructions: [
			`Open your ${walletName} app and choose "Send Money".`,
			`Send exactly ${payableAmount} BDT to ${merchantNumber} (${accountType}).`,
			'Copy the transaction ID from the confirmation message.',
			'Submit the transaction ID and a screenshot on the payment page to complete your order.'
		]
	};
};

/** COD orders are settled when the parcel is delivered. */
export const resolvePaymentStatusForDelivery = (
	method: PaymentMethod,
	current: PaymentStatus
): PaymentStatus | undefined => {
	if (method === PaymentMethod.CashOnDelivery && current !== PaymentStatus.Verified) {
		return PaymentStatus.Verified;
	}
	return undefined;
};
