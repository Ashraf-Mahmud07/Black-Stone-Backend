import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../app/interface/auth';
import { TDeliverySetting } from '../app/modules/Delivery/delivery.interfaces';
import { OrderStatus, PaymentMethod, PaymentStatus, TOrder } from '../app/modules/Order/order.interfaces';

const orderRepositoryMock = vi.hoisted(() => ({ findById: vi.fn(), updatePricing: vi.fn() }));
const deliveryRepositoryMock = vi.hoisted(() => ({ getSetting: vi.fn() }));
const paymentRepositoryMock = vi.hoisted(() => ({ findByOrderId: vi.fn(), updateAmount: vi.fn() }));

vi.mock('../app/modules/Order/order.repository', () => ({ default: orderRepositoryMock }));
vi.mock('../app/modules/Delivery/delivery.repository', () => ({ default: deliveryRepositoryMock }));
vi.mock('../app/modules/Payment/payment.repository', () => ({ default: paymentRepositoryMock }));

import OrderServices from '../app/modules/Order/order.services';
import OrderValidations from '../app/modules/Order/order.validations';

const admin = { id: '6650f1a2b3c4d5e6f7a8b9c0', email: 'admin@blackstone.test', role: UserRole.Admin };

const deliverySetting: TDeliverySetting = {
	defaultCharge: 130,
	freeDeliveryEnabled: false,
	freeDeliveryThreshold: 0,
	areas: [{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 60, isActive: true }]
};

/** subtotal 1700 - discount 260 = 1440 items payable, + 60 delivery = 1500 total. */
const buildOrder = (overrides: Partial<TOrder> = {}): TOrder => ({
	id: '6650f1a2b3c4d5e6f7a8b9c1',
	orderNumber: 'BS-260309-A1B2C3',
	customer: { name: 'Ayesha Rahman', phone: '01712345678', isGuest: true },
	shippingAddress: { name: 'Ayesha Rahman', phone: '01712345678', address: 'House 12, Road 4, Dhanmondi' },
	items: [],
	subtotal: 1700,
	discount: 260,
	manualDiscount: 0,
	deliveryCharge: 60,
	deliveryChargeOverridden: false,
	deliveryArea: 'inside-dhaka',
	total: 1500,
	paymentMethod: PaymentMethod.Bkash,
	paymentStatus: PaymentStatus.Pending,
	status: OrderStatus.Pending,
	statusHistory: [],
	pricingHistory: [],
	stockRestored: false,
	...overrides
});

/** The repository echoes the update back, like the real findByIdAndUpdate does. */
const echoUpdate = (order: TOrder) => {
	orderRepositoryMock.updatePricing.mockImplementation(async (_id: string, update: Record<string, unknown>) => ({
		...order,
		manualDiscount: update.manualDiscount as number,
		deliveryCharge: update.deliveryCharge as number,
		deliveryChargeOverridden: update.deliveryChargeOverridden as boolean,
		total: update.total as number
	}));
};

const lastPricingUpdate = () => orderRepositoryMock.updatePricing.mock.calls[0][1];

describe('adjustOrderPricing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deliveryRepositoryMock.getSetting.mockResolvedValue(deliverySetting);
		paymentRepositoryMock.findByOrderId.mockResolvedValue(null);
		paymentRepositoryMock.updateAmount.mockResolvedValue(null);
	});

	it('applies a negotiated discount without touching the derived item discount', async () => {
		const order = buildOrder();
		orderRepositoryMock.findById.mockResolvedValue(order);
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(
			order.id,
			{ manualDiscount: 250, note: 'Negotiated over phone' },
			admin
		);

		// 1700 - 260 - 250 + 60
		expect(result.order.total).toBe(1250);
		expect(result.order.manualDiscount).toBe(250);
		expect(result.order.discount).toBe(260);
		expect(result.refundDue).toBe(0);

		const update = lastPricingUpdate();
		expect(update).toMatchObject({ manualDiscount: 250, deliveryCharge: 60, total: 1250 });
		expect(update.historyEntry).toMatchObject({
			byId: admin.id,
			byRole: UserRole.Admin,
			previousTotal: 1500,
			newTotal: 1250,
			manualDiscount: 250,
			note: 'Negotiated over phone'
		});
	});

	it('waives the delivery charge for a single order and flags the override', async () => {
		const order = buildOrder();
		orderRepositoryMock.findById.mockResolvedValue(order);
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(order.id, { deliveryCharge: 0 }, admin);

		expect(result.order.deliveryCharge).toBe(0);
		expect(result.order.deliveryChargeOverridden).toBe(true);
		expect(result.order.total).toBe(1440);
	});

	it('restores the area charge and clears the override on resetDelivery', async () => {
		const order = buildOrder({ deliveryCharge: 0, deliveryChargeOverridden: true, total: 1440 });
		orderRepositoryMock.findById.mockResolvedValue(order);
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(order.id, { resetDelivery: true }, admin);

		expect(deliveryRepositoryMock.getSetting).toHaveBeenCalledOnce();
		expect(result.order.deliveryCharge).toBe(60);
		expect(result.order.deliveryChargeOverridden).toBe(false);
		expect(result.order.total).toBe(1500);
	});

	it('keeps an existing delivery override when only the discount changes', async () => {
		const order = buildOrder({ deliveryCharge: 0, deliveryChargeOverridden: true, total: 1440 });
		orderRepositoryMock.findById.mockResolvedValue(order);
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(order.id, { manualDiscount: 200 }, admin);

		expect(result.order.deliveryCharge).toBe(0);
		expect(result.order.deliveryChargeOverridden).toBe(true);
		expect(result.order.total).toBe(1240);
	});

	it('rejects an unknown order', async () => {
		orderRepositoryMock.findById.mockResolvedValue(null);
		await expect(OrderServices.adjustOrderPricing('missing', { manualDiscount: 10 }, admin)).rejects.toThrowError(
			'Order not found!'
		);
	});

	it('refuses to change the pricing of a delivered or cancelled order', async () => {
		orderRepositoryMock.findById.mockResolvedValue(buildOrder({ status: OrderStatus.Delivered }));
		await expect(
			OrderServices.adjustOrderPricing('6650f1a2b3c4d5e6f7a8b9c1', { manualDiscount: 100 }, admin)
		).rejects.toThrowError('The pricing of a delivered order can no longer be changed.');

		orderRepositoryMock.findById.mockResolvedValue(buildOrder({ status: OrderStatus.Cancelled }));
		await expect(
			OrderServices.adjustOrderPricing('6650f1a2b3c4d5e6f7a8b9c1', { manualDiscount: 100 }, admin)
		).rejects.toThrowError('The pricing of a cancelled order can no longer be changed.');

		expect(orderRepositoryMock.updatePricing).not.toHaveBeenCalled();
	});

	it('rejects a manual discount larger than the item total', async () => {
		orderRepositoryMock.findById.mockResolvedValue(buildOrder());

		await expect(
			OrderServices.adjustOrderPricing('6650f1a2b3c4d5e6f7a8b9c1', { manualDiscount: 2000 }, admin)
		).rejects.toThrowError('A manual discount of 2000 exceeds the item total of 1440 for this order.');
		expect(orderRepositoryMock.updatePricing).not.toHaveBeenCalled();
	});

	it('rejects an adjustment that would drive the total below zero', async () => {
		// defensive guard: only reachable from inconsistent stored amounts
		orderRepositoryMock.findById.mockResolvedValue(
			buildOrder({ subtotal: 100, discount: 200, deliveryCharge: 0, total: 0 })
		);

		await expect(
			OrderServices.adjustOrderPricing('6650f1a2b3c4d5e6f7a8b9c1', { deliveryCharge: 0 }, admin)
		).rejects.toThrowError('This adjustment would make the order total negative!');
		expect(orderRepositoryMock.updatePricing).not.toHaveBeenCalled();
	});

	it('reports refundDue when a verified payment now exceeds the total, and leaves the payment alone', async () => {
		const order = buildOrder({ paymentStatus: PaymentStatus.Verified });
		orderRepositoryMock.findById.mockResolvedValue(order);
		paymentRepositoryMock.findByOrderId.mockResolvedValue({ id: 'pay1', amount: 1500 });
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(order.id, { manualDiscount: 250 }, admin);

		expect(result.order.total).toBe(1250);
		expect(result.refundDue).toBe(250);
		// a verified payment record is never rewritten
		expect(paymentRepositoryMock.updateAmount).not.toHaveBeenCalled();
	});

	it('does not report a refund when the verified total goes up', async () => {
		const order = buildOrder({ paymentStatus: PaymentStatus.Verified, manualDiscount: 250, total: 1250 });
		orderRepositoryMock.findById.mockResolvedValue(order);
		paymentRepositoryMock.findByOrderId.mockResolvedValue({ id: 'pay1', amount: 1250 });
		echoUpdate(order);

		const result = await OrderServices.adjustOrderPricing(order.id, { manualDiscount: 0 }, admin);

		expect(result.order.total).toBe(1500);
		expect(result.refundDue).toBe(0);
	});

	it('keeps an unpaid payment amount in step with the new total', async () => {
		const order = buildOrder({ paymentStatus: PaymentStatus.Pending });
		orderRepositoryMock.findById.mockResolvedValue(order);
		paymentRepositoryMock.findByOrderId.mockResolvedValue({ id: 'pay1', amount: 1500 });
		echoUpdate(order);

		await OrderServices.adjustOrderPricing(order.id, { manualDiscount: 250 }, admin);

		// the amount the customer is asked to send must match the adjusted total
		expect(paymentRepositoryMock.updateAmount).toHaveBeenCalledWith('pay1', 1250);
	});
});

describe('adjustPricingValidation', () => {
	const parse = (body: unknown) => OrderValidations.adjustPricingValidation.safeParse({ body, params: {}, query: {} });

	it('accepts each supported change', () => {
		expect(parse({ manualDiscount: 250, note: 'Negotiated over phone' }).success).toBe(true);
		expect(parse({ deliveryCharge: 0 }).success).toBe(true);
		expect(parse({ resetDelivery: true }).success).toBe(true);
	});

	it('rejects an empty body and a note-only body', () => {
		expect(parse({}).success).toBe(false);
		expect(parse({ note: 'nothing to change' }).success).toBe(false);
	});

	it('rejects a client supplied total or any other unknown field', () => {
		expect(parse({ manualDiscount: 250, total: 1 }).success).toBe(false);
		expect(parse({ subtotal: 1000 }).success).toBe(false);
		expect(parse({ discount: 100 }).success).toBe(false);
	});

	it('rejects sending both a delivery charge and a reset', () => {
		expect(parse({ deliveryCharge: 0, resetDelivery: true }).success).toBe(false);
		// an explicit false is not a reset, so this stays valid
		expect(parse({ deliveryCharge: 0, resetDelivery: false }).success).toBe(true);
	});

	it('rejects negative amounts and an over-long note', () => {
		expect(parse({ manualDiscount: -1 }).success).toBe(false);
		expect(parse({ deliveryCharge: -1 }).success).toBe(false);
		expect(parse({ manualDiscount: 10, note: 'x'.repeat(501) }).success).toBe(false);
	});
});
