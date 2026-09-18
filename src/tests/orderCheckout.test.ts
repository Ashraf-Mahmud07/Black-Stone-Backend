import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeliveryArea, TDeliverySetting } from '../app/modules/Delivery/delivery.interfaces';
import { OrderStatus, PaymentMethod, PaymentStatus, TOrder } from '../app/modules/Order/order.interfaces';
import { ProductStatus, TProduct } from '../app/modules/Product/product.interfaces';

const orderRepositoryMock = vi.hoisted(() => ({
	create: vi.fn(),
	findByIdempotencyKey: vi.fn(),
	findRecentDuplicate: vi.fn(),
	attachPayment: vi.fn()
}));
const deliveryRepositoryMock = vi.hoisted(() => ({ getSetting: vi.fn() }));
const paymentRepositoryMock = vi.hoisted(() => ({ create: vi.fn() }));
const productRepositoryMock = vi.hoisted(() => ({
	findById: vi.fn(),
	reserveStock: vi.fn(),
	releaseStock: vi.fn()
}));

vi.mock('../app/modules/Order/order.repository', () => ({ default: orderRepositoryMock }));
vi.mock('../app/modules/Delivery/delivery.repository', () => ({ default: deliveryRepositoryMock }));
vi.mock('../app/modules/Payment/payment.repository', () => ({ default: paymentRepositoryMock }));
vi.mock('../app/modules/Product/product.repository', () => ({ default: productRepositoryMock }));

import OrderServices from '../app/modules/Order/order.services';
import OrderValidations from '../app/modules/Order/order.validations';

const deliverySetting: TDeliverySetting = {
	defaultCharge: 80,
	freeDeliveryEnabled: false,
	freeDeliveryThreshold: 0,
	areas: [
		{ key: DeliveryArea.InsideDhaka, name: 'Inside Dhaka', charge: 80, isActive: true },
		{ key: DeliveryArea.OutsideDhaka, name: 'Outside Dhaka', charge: 150, isActive: true }
	]
};

const product: TProduct = {
	id: '6650f1a2b3c4d5e6f7a8b9c0',
	name: 'Premium Jersey Hijab',
	slug: 'premium-jersey-hijab',
	description: 'Soft premium jersey hijab.',
	categoryId: '6650f1a2b3c4d5e6f7a8b9aa',
	images: [],
	videos: [],
	price: 1000,
	sku: 'HIJAB-JRSY01',
	variants: [],
	specifications: [],
	stock: 50,
	status: ProductStatus.Active,
	featured: false,
	tags: [],
	ratingAverage: 0,
	ratingCount: 0,
	isDeleted: false
};

const basePayload = {
	items: [{ productId: product.id, quantity: 2 }],
	customer: { name: 'Ayesha Rahman', phone: '01712345678' },
	shippingAddress: { address: 'House 12, Road 4, Dhanmondi, Dhaka 1209' },
	deliveryArea: DeliveryArea.InsideDhaka
};

/** Echoes the document back the way mongoose would. */
const createdOrder = (input: Record<string, unknown>): TOrder =>
	({
		...input,
		id: '6650f1a2b3c4d5e6f7a8b9c1',
		orderNumber: 'BS-260319-A1B2C3',
		pricingHistory: []
	}) as unknown as TOrder;

const lastCreateArgs = () => orderRepositoryMock.create.mock.calls[0][0];

describe('createOrder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deliveryRepositoryMock.getSetting.mockResolvedValue(deliverySetting);
		productRepositoryMock.findById.mockResolvedValue(product);
		productRepositoryMock.reserveStock.mockResolvedValue({ success: true });
		productRepositoryMock.releaseStock.mockResolvedValue(undefined);
		orderRepositoryMock.findByIdempotencyKey.mockResolvedValue(null);
		orderRepositoryMock.findRecentDuplicate.mockResolvedValue(null);
		orderRepositoryMock.create.mockImplementation(async (input: Record<string, unknown>) => createdOrder(input));
		orderRepositoryMock.attachPayment.mockResolvedValue(undefined);
		paymentRepositoryMock.create.mockResolvedValue({ id: 'pay1', amount: 0 });
	});

	it('stores cash on delivery even when the client asks for bKash', async () => {
		const result = await OrderServices.createOrder({ ...basePayload, paymentMethod: PaymentMethod.Bkash });

		expect(lastCreateArgs().paymentMethod).toBe(PaymentMethod.CashOnDelivery);
		expect(result.order.paymentMethod).toBe(PaymentMethod.CashOnDelivery);
		expect(paymentRepositoryMock.create.mock.calls[0][0].method).toBe(PaymentMethod.CashOnDelivery);
		// the wallet instructions are never produced for a COD order
		expect(result.paymentInstructions.merchantNumber).toBeUndefined();
		expect(result.paymentInstructions.method).toBe(PaymentMethod.CashOnDelivery);
	});

	it('computes the total from the catalogue and the area, not from the client', async () => {
		await OrderServices.createOrder({ ...basePayload, expectedTotal: 5 });

		const created = lastCreateArgs();
		// 2 x 1000 + 80 inside Dhaka
		expect(created.subtotal).toBe(2000);
		expect(created.deliveryCharge).toBe(80);
		expect(created.total).toBe(2080);
		expect(created.paymentStatus).toBe(PaymentStatus.Pending);
		expect(created.status).toBe(OrderStatus.Pending);
	});

	it('charges the outside Dhaka rate for the other area', async () => {
		await OrderServices.createOrder({ ...basePayload, deliveryArea: DeliveryArea.OutsideDhaka });

		expect(lastCreateArgs().deliveryCharge).toBe(150);
		expect(lastCreateArgs().total).toBe(2150);
		expect(lastCreateArgs().deliveryArea).toBe(DeliveryArea.OutsideDhaka);
	});

	it('rejects a missing or unsupported delivery area', async () => {
		await expect(
			OrderServices.createOrder({ ...basePayload, deliveryArea: 'CHITTAGONG' as DeliveryArea })
		).rejects.toThrowError('Delivery area must be INSIDE_DHAKA or OUTSIDE_DHAKA!');

		expect(productRepositoryMock.reserveStock).not.toHaveBeenCalled();
		expect(orderRepositoryMock.create).not.toHaveBeenCalled();
	});

	it('copies the recipient name and number from the customer and normalises the phone', async () => {
		await OrderServices.createOrder({
			...basePayload,
			customer: { name: 'Ayesha Rahman', phone: '+880 1712-345678' }
		});

		const created = lastCreateArgs();
		expect(created.customer.phone).toBe('01712345678');
		expect(created.shippingAddress.name).toBe('Ayesha Rahman');
		expect(created.shippingAddress.phone).toBe('01712345678');
		expect(created.shippingAddress.address).toBe('House 12, Road 4, Dhanmondi, Dhaka 1209');
	});

	it('returns the original order for a repeated Idempotency-Key instead of creating a second one', async () => {
		const first = await OrderServices.createOrder({ ...basePayload, idempotencyKey: 'key-123' });
		expect(first.duplicateOf).toBeUndefined();

		orderRepositoryMock.findByIdempotencyKey.mockResolvedValue(first.order);
		const second = await OrderServices.createOrder({ ...basePayload, idempotencyKey: 'key-123' });

		expect(second.order.orderNumber).toBe(first.order.orderNumber);
		expect(second.duplicateOf).toBe(first.order.orderNumber);
		// only the first request created anything
		expect(orderRepositoryMock.create).toHaveBeenCalledTimes(1);
		expect(productRepositoryMock.reserveStock).toHaveBeenCalledTimes(1);
	});

	it('treats an identical basket from the same number inside the window as the same order', async () => {
		const first = await OrderServices.createOrder(basePayload);
		orderRepositoryMock.findRecentDuplicate.mockResolvedValue(first.order);

		const second = await OrderServices.createOrder(basePayload);

		expect(second.duplicateOf).toBe(first.order.orderNumber);
		expect(orderRepositoryMock.create).toHaveBeenCalledTimes(1);
	});

	it('hands back the winner and releases stock when two requests race on the same key', async () => {
		const winner = createdOrder({ ...basePayload, paymentMethod: PaymentMethod.CashOnDelivery, total: 2080 });
		orderRepositoryMock.create.mockRejectedValueOnce(
			Object.assign(new Error('E11000 duplicate key'), { code: 11000, keyPattern: { idempotencyKey: 1 } })
		);
		orderRepositoryMock.findByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);

		const result = await OrderServices.createOrder({ ...basePayload, idempotencyKey: 'race-key' });

		expect(result.duplicateOf).toBe(winner.orderNumber);
		// the losing request must not hold on to reserved stock
		expect(productRepositoryMock.releaseStock).toHaveBeenCalledTimes(1);
	});

	it('records the fingerprint and key so a later request can match them', async () => {
		await OrderServices.createOrder({ ...basePayload, idempotencyKey: 'key-abc' });

		const created = lastCreateArgs();
		expect(created.idempotencyKey).toBe('key-abc');
		expect(created.duplicateFingerprint).toMatch(/^[a-f0-9]{64}$/);
	});
});

describe('createOrderValidation', () => {
	const parse = (body: unknown) => OrderValidations.createOrderValidation.safeParse({ body, params: {}, query: {} });

	const valid = {
		items: [{ productId: '6650f1a2b3c4d5e6f7a8b9c0', quantity: 1 }],
		customer: { name: 'Ayesha Rahman', phone: '01712345678' },
		shippingAddress: { address: 'House 12, Road 4, Dhanmondi' },
		deliveryArea: 'INSIDE_DHAKA'
	};

	it('accepts the four collected fields and nothing more', () => {
		const result = parse(valid);
		expect(result.success).toBe(true);
	});

	it('normalises the phone number and the delivery area', () => {
		const result = parse({
			...valid,
			customer: { name: 'Ayesha Rahman', phone: '+880 1712-345678' },
			deliveryArea: 'inside-dhaka'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.body.customer.phone).toBe('01712345678');
			expect(result.data.body.deliveryArea).toBe(DeliveryArea.InsideDhaka);
		}
	});

	it('requires the delivery area', () => {
		const { deliveryArea, ...withoutArea } = valid;
		expect(deliveryArea).toBeDefined();
		const result = parse(withoutArea);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.path.includes('deliveryArea'))).toBe(true);
		}
	});

	it('rejects an unsupported delivery area', () => {
		expect(parse({ ...valid, deliveryArea: 'CHITTAGONG' }).success).toBe(false);
	});

	it('rejects a bad phone number and an empty address', () => {
		expect(parse({ ...valid, customer: { name: 'Ayesha', phone: '12345' } }).success).toBe(false);
		expect(parse({ ...valid, shippingAddress: { address: '' } }).success).toBe(false);
	});

	it('no longer requires a payment method, notes, email or a second name and phone', () => {
		expect(parse(valid).success).toBe(true);
		expect(parse({ ...valid, paymentMethod: 'bkash' }).success).toBe(true);
	});
});
