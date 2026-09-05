import { describe, expect, it } from 'vitest';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../app/modules/Order/order.interfaces';
import {
	buildPaymentInstructions,
	canCustomerCancel,
	canTransition,
	generateOrderNumber,
	isManualPaymentMethod,
	resolvePaymentStatusForDelivery
} from '../app/modules/Order/order.utils';

describe('order status transitions', () => {
	it('allows the happy path', () => {
		expect(canTransition(OrderStatus.Pending, OrderStatus.Confirmed)).toBe(true);
		expect(canTransition(OrderStatus.Confirmed, OrderStatus.Processing)).toBe(true);
		expect(canTransition(OrderStatus.Processing, OrderStatus.Shipped)).toBe(true);
		expect(canTransition(OrderStatus.Shipped, OrderStatus.Delivered)).toBe(true);
	});

	it('rejects skipping and going backwards', () => {
		expect(canTransition(OrderStatus.Pending, OrderStatus.Shipped)).toBe(false);
		expect(canTransition(OrderStatus.Delivered, OrderStatus.Processing)).toBe(false);
		expect(canTransition(OrderStatus.Cancelled, OrderStatus.Confirmed)).toBe(false);
	});

	it('does not allow cancelling a shipped or delivered order', () => {
		expect(canTransition(OrderStatus.Shipped, OrderStatus.Cancelled)).toBe(false);
		expect(canTransition(OrderStatus.Delivered, OrderStatus.Cancelled)).toBe(false);
		expect(canTransition(OrderStatus.Pending, OrderStatus.Cancelled)).toBe(true);
	});

	it('lets customers cancel only before processing', () => {
		expect(canCustomerCancel(OrderStatus.Pending)).toBe(true);
		expect(canCustomerCancel(OrderStatus.Confirmed)).toBe(true);
		expect(canCustomerCancel(OrderStatus.Processing)).toBe(false);
		expect(canCustomerCancel(OrderStatus.Shipped)).toBe(false);
	});
});

describe('order numbers', () => {
	it('follows the BS-YYMMDD-XXXXXX format and is unique per call', () => {
		const orderNumber = generateOrderNumber(new Date('2026-03-09T10:00:00Z'));
		expect(orderNumber).toMatch(/^BS-260309-[A-Z0-9]{1,6}$/);
		expect(generateOrderNumber()).not.toBe(generateOrderNumber());
	});
});

describe('payment method helpers', () => {
	it('flags bKash and Nagad as manual verification methods', () => {
		expect(isManualPaymentMethod(PaymentMethod.Bkash)).toBe(true);
		expect(isManualPaymentMethod(PaymentMethod.Nagad)).toBe(true);
		expect(isManualPaymentMethod(PaymentMethod.CashOnDelivery)).toBe(false);
	});

	it('builds wallet instructions with the payable amount', () => {
		const instructions = buildPaymentInstructions(PaymentMethod.Bkash, 1500);
		expect(instructions.payableAmount).toBe(1500);
		expect(instructions.instructions.join(' ')).toContain('1500');
	});

	it('marks a COD payment as verified once the order is delivered', () => {
		expect(resolvePaymentStatusForDelivery(PaymentMethod.CashOnDelivery, PaymentStatus.Pending)).toBe(
			PaymentStatus.Verified
		);
		expect(resolvePaymentStatusForDelivery(PaymentMethod.Bkash, PaymentStatus.Submitted)).toBeUndefined();
	});
});
