import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TAuthUser, UserRole } from '../../interface/auth';
import { TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import { calculateOrderTotals, roundMoney } from '../../utils/pricing';
import { buildVariantLabel } from '../Cart/cart.services';
import CartRepository from '../Cart/cart.repository';
import DeliveryRepository from '../Delivery/delivery.repository';
import { resolveDeliveryCharge } from '../Delivery/delivery.utils';
import PaymentRepository from '../Payment/payment.repository';
import { TResolvedLine, TStockLine } from '../Product/product.interfaces';
import ProductRepository from '../Product/product.repository';
import ProductServices from '../Product/product.services';
import {
	OrderStatus,
	PaymentMethod,
	PaymentStatus,
	TCheckoutItemInput,
	TCheckoutPayload,
	TCheckoutPreviewPayload,
	TCheckoutSummary,
	TOrder,
	TOrderFilters,
	TOrderItem,
	TPaymentInstructions,
	TUpdateOrderStatusPayload
} from './order.interfaces';
import OrderRepository from './order.repository';
import {
	buildPaymentInstructions,
	canCustomerCancel,
	canTransition,
	isManualPaymentMethod,
	resolvePaymentStatusForDelivery,
	shouldRestoreStock
} from './order.utils';

const MAX_ITEMS_PER_ORDER = 50;

// ---------------------------------------------------------------------------
// line resolution (shared by preview and order creation)
// ---------------------------------------------------------------------------

const collectItems = async (
	payload: { source?: 'cart' | 'direct'; items?: TCheckoutItemInput[] },
	authUser?: TAuthUser
): Promise<{ items: TCheckoutItemInput[]; fromCart: boolean }> => {
	const useCart = payload.source === 'cart' || (!payload.items?.length && Boolean(authUser));

	if (useCart) {
		if (!authUser) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Please login to check out with your cart!');
		}
		const cart = await CartRepository.findByUserId(authUser.id);
		if (!cart?.items.length) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Your cart is empty!');
		}
		return {
			items: cart.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
			fromCart: true
		};
	}

	if (!payload.items?.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'At least one item is required!');
	}
	if (payload.items.length > MAX_ITEMS_PER_ORDER) {
		throw new AppError(httpStatus.BAD_REQUEST, `An order can contain at most ${MAX_ITEMS_PER_ORDER} different items!`);
	}

	return { items: payload.items, fromCart: false };
};

/** Merges duplicate lines so stock is validated against the real total quantity. */
const mergeItems = (items: TCheckoutItemInput[]): TCheckoutItemInput[] => {
	const merged = new Map<string, TCheckoutItemInput>();
	items.forEach((item) => {
		const key = `${item.productId}:${item.variantId ?? ''}`;
		const existing = merged.get(key);
		if (existing) existing.quantity += item.quantity;
		else merged.set(key, { ...item });
	});
	return [...merged.values()];
};

const resolveLines = async (items: TCheckoutItemInput[]): Promise<TResolvedLine[]> => {
	const resolved: TResolvedLine[] = [];
	for (const item of mergeItems(items)) {
		// prices, availability and stock always come from the database
		resolved.push(await ProductServices.resolvePurchasableLine(item.productId, item.quantity, item.variantId));
	}
	return resolved;
};

const buildSummary = async (lines: TResolvedLine[], deliveryArea?: string): Promise<TCheckoutSummary> => {
	const setting = await DeliveryRepository.getSetting();
	const itemsTotal = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
	const delivery = resolveDeliveryCharge(setting, itemsTotal, deliveryArea);
	const totals = calculateOrderTotals(lines, delivery.deliveryCharge);

	return {
		items: lines.map((line) => ({
			productId: line.product.id,
			variantId: line.variant?.id,
			name: line.product.name,
			image: line.variant?.image ?? line.product.images.find((image) => image.isPrimary) ?? line.product.images[0],
			variantLabel: buildVariantLabel(line.variant),
			quantity: line.quantity,
			listPrice: line.listPrice,
			unitPrice: line.unitPrice,
			subtotal: roundMoney(line.unitPrice * line.quantity)
		})),
		subtotal: totals.subtotal,
		discount: totals.discount,
		deliveryCharge: totals.deliveryCharge,
		deliveryArea: delivery.areaKey ?? deliveryArea,
		isFreeDelivery: delivery.isFreeDelivery,
		total: totals.total
	};
};

/**
 * Checkout preview - the storefront uses this to show the real totals before the customer
 * confirms. Nothing sent by the client (price, discount, delivery charge, total) is trusted.
 */
const previewCheckout = async (payload: TCheckoutPreviewPayload, authUser?: TAuthUser): Promise<TCheckoutSummary> => {
	const { items } = await collectItems(payload, authUser);
	const lines = await resolveLines(items);
	return buildSummary(lines, payload.deliveryArea);
};

// ---------------------------------------------------------------------------
// order creation
// ---------------------------------------------------------------------------

const toOrderItems = (lines: TResolvedLine[]): TOrderItem[] =>
	lines.map((line) => ({
		product: {
			productId: line.product.id,
			name: line.product.name,
			slug: line.product.slug,
			sku: line.product.sku,
			image: line.variant?.image ?? line.product.images.find((image) => image.isPrimary) ?? line.product.images[0],
			specifications: line.product.specifications
		},
		variant: line.variant
			? {
					variantId: line.variant.id,
					sku: line.variant.sku,
					label: buildVariantLabel(line.variant),
					color: line.variant.color,
					size: line.variant.size,
					design: line.variant.design,
					attributes: line.variant.attributes
				}
			: undefined,
		quantity: line.quantity,
		listPrice: line.listPrice,
		unitPrice: line.unitPrice,
		discount: roundMoney((line.listPrice - line.unitPrice) * line.quantity),
		subtotal: roundMoney(line.unitPrice * line.quantity)
	}));

const toStockLines = (lines: TResolvedLine[]): TStockLine[] =>
	lines.map((line) => ({ productId: line.product.id, variantId: line.variant?.id, quantity: line.quantity }));

export type TCreateOrderResult = {
	order: TOrder;
	paymentInstructions: TPaymentInstructions;
};

const createOrder = async (payload: TCheckoutPayload, authUser?: TAuthUser): Promise<TCreateOrderResult> => {
	const { items, fromCart } = await collectItems(payload, authUser);
	const lines = await resolveLines(items);
	const summary = await buildSummary(lines, payload.deliveryArea);

	// reserve stock first: the conditional decrements make concurrent overselling impossible
	const reservation = await ProductRepository.reserveStock(toStockLines(lines));
	if (!reservation.success) {
		const failed = lines.find(
			(line) =>
				line.product.id === reservation.failedLine?.productId &&
				(line.variant?.id ?? undefined) === reservation.failedLine?.variantId
		);
		throw new AppError(
			httpStatus.CONFLICT,
			`"${failed?.product.name ?? 'One of the products'}" just went out of stock. Please review your order.`
		);
	}

	const paymentStatus = PaymentStatus.Pending;

	try {
		const order = await OrderRepository.create({
			userId: authUser?.role === UserRole.Customer ? authUser.id : undefined,
			customer: {
				userId: authUser?.role === UserRole.Customer ? authUser.id : undefined,
				name: payload.customer.name,
				phone: payload.customer.phone,
				email: payload.customer.email,
				isGuest: !authUser
			},
			shippingAddress: payload.shippingAddress,
			items: toOrderItems(lines),
			subtotal: summary.subtotal,
			discount: summary.discount,
			deliveryCharge: summary.deliveryCharge,
			deliveryArea: summary.deliveryArea,
			total: summary.total,
			paymentMethod: payload.paymentMethod,
			paymentStatus,
			status: OrderStatus.Pending,
			statusHistory: [{ status: OrderStatus.Pending, at: new Date(), note: 'Order placed' }],
			customerNotes: payload.customerNotes,
			stockRestored: false
		});

		const payment = await PaymentRepository.create({
			orderId: order.id,
			orderNumber: order.orderNumber,
			method: payload.paymentMethod,
			amount: order.total,
			status: paymentStatus
		});
		await OrderRepository.attachPayment(order.id, payment.id);

		if (fromCart && authUser) {
			await CartRepository.clear(authUser.id);
		}

		return {
			order: { ...order, paymentId: payment.id },
			paymentInstructions: buildPaymentInstructions(payload.paymentMethod, order.total)
		};
	} catch (error) {
		// never keep stock reserved for an order that was not created
		await ProductRepository.releaseStock(toStockLines(lines));
		throw error;
	}
};

// ---------------------------------------------------------------------------
// reading orders
// ---------------------------------------------------------------------------

const parseDate = (value: unknown): Date | undefined => {
	if (typeof value !== 'string' || !value) return undefined;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildFilters = (query: Record<string, unknown>): TOrderFilters => ({
	search: typeof query.search === 'string' ? query.search : undefined,
	status: typeof query.status === 'string' ? (query.status as OrderStatus) : undefined,
	paymentStatus: typeof query.paymentStatus === 'string' ? (query.paymentStatus as PaymentStatus) : undefined,
	paymentMethod: typeof query.paymentMethod === 'string' ? (query.paymentMethod as PaymentMethod) : undefined,
	from: parseDate(query.from),
	to: parseDate(query.to)
});

const getOrders = async (query: Record<string, unknown>): Promise<TPaginatedResult<TOrder>> =>
	OrderRepository.findMany(buildFilters(query), calculatePagination(query));

const getMyOrders = async (userId: string, query: Record<string, unknown>): Promise<TPaginatedResult<TOrder>> =>
	OrderRepository.findMany({ ...buildFilters(query), userId }, calculatePagination(query));

const assertCanAccess = (order: TOrder, authUser: TAuthUser): void => {
	if (authUser.role === UserRole.Admin) return;
	if (order.userId && order.userId === authUser.id) return;
	throw new AppError(httpStatus.FORBIDDEN, 'Access denied!');
};

const getOrderById = async (id: string, authUser: TAuthUser): Promise<TOrder> => {
	const order = await OrderRepository.findById(id);
	if (!order) {
		throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
	}
	assertCanAccess(order, authUser);
	return order;
};

/** Guest order tracking - the phone number acts as the shared secret. */
const trackOrder = async (orderNumber: string, phone: string): Promise<TOrder> => {
	const order = await OrderRepository.findByOrderNumber(orderNumber);
	if (!order || order.customer.phone.replace(/\s/g, '') !== phone.replace(/\s/g, '')) {
		throw new AppError(httpStatus.NOT_FOUND, 'No order found with this order number and phone number!');
	}
	return order;
};

// ---------------------------------------------------------------------------
// status management
// ---------------------------------------------------------------------------

const restoreStock = async (order: TOrder): Promise<void> => {
	if (order.stockRestored) return;
	await ProductRepository.releaseStock(
		order.items.map((item) => ({
			productId: item.product.productId,
			variantId: item.variant?.variantId,
			quantity: item.quantity
		}))
	);
};

const updateOrderStatus = async (
	id: string,
	payload: TUpdateOrderStatusPayload,
	authUser: TAuthUser
): Promise<TOrder> => {
	const order = await OrderRepository.findById(id);
	if (!order) {
		throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
	}

	if (order.status === payload.status) {
		throw new AppError(httpStatus.BAD_REQUEST, `This order is already ${payload.status}!`);
	}
	if (!canTransition(order.status, payload.status)) {
		throw new AppError(httpStatus.BAD_REQUEST, `An order cannot go from "${order.status}" to "${payload.status}".`);
	}

	const now = new Date();
	const update: Parameters<typeof OrderRepository.updateStatus>[1] = {
		status: payload.status,
		historyEntry: {
			status: payload.status,
			at: now,
			byId: authUser.id,
			byRole: authUser.role,
			note: payload.note
		}
	};

	if (payload.status === OrderStatus.Confirmed) update.confirmedAt = now;
	if (payload.status === OrderStatus.Delivered) {
		update.deliveredAt = now;
		const nextPaymentStatus = resolvePaymentStatusForDelivery(order.paymentMethod, order.paymentStatus);
		if (nextPaymentStatus) update.paymentStatus = nextPaymentStatus;
	}
	if (shouldRestoreStock(payload.status)) {
		await restoreStock(order);
		update.stockRestored = true;
		update.cancelledAt = now;
		update.cancellationReason = payload.note;
	}

	const updated = await OrderRepository.updateStatus(id, update);
	return updated as TOrder;
};

const cancelOrder = async (id: string, authUser: TAuthUser, reason?: string): Promise<TOrder> => {
	const order = await OrderRepository.findById(id);
	if (!order) {
		throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
	}
	assertCanAccess(order, authUser);

	if (order.status === OrderStatus.Cancelled) {
		throw new AppError(httpStatus.BAD_REQUEST, 'This order is already cancelled!');
	}
	if (authUser.role !== UserRole.Admin && !canCustomerCancel(order.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`An order that is already ${order.status} cannot be cancelled. Please contact support.`
		);
	}
	if (!canTransition(order.status, OrderStatus.Cancelled)) {
		throw new AppError(httpStatus.BAD_REQUEST, `An order that is already ${order.status} cannot be cancelled.`);
	}

	await restoreStock(order);

	const now = new Date();
	const updated = await OrderRepository.updateStatus(id, {
		status: OrderStatus.Cancelled,
		stockRestored: true,
		cancelledAt: now,
		cancellationReason: reason,
		historyEntry: {
			status: OrderStatus.Cancelled,
			at: now,
			byId: authUser.id,
			byRole: authUser.role,
			note: reason
		}
	});

	return updated as TOrder;
};

const updateAdminNotes = async (id: string, adminNotes: string): Promise<TOrder> => {
	const updated = await OrderRepository.updateAdminNotes(id, adminNotes);
	if (!updated) {
		throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
	}
	return updated;
};

const getPaymentInstructions = async (id: string, authUser: TAuthUser): Promise<TPaymentInstructions> => {
	const order = await getOrderById(id, authUser);
	if (!isManualPaymentMethod(order.paymentMethod)) {
		return buildPaymentInstructions(order.paymentMethod, order.total);
	}
	return buildPaymentInstructions(order.paymentMethod, order.total);
};

const OrderServices = {
	previewCheckout,
	createOrder,
	getOrders,
	getMyOrders,
	getOrderById,
	trackOrder,
	updateOrderStatus,
	cancelOrder,
	updateAdminNotes,
	getPaymentInstructions
};

export default OrderServices;
