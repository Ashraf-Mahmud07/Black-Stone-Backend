import { FilterQuery } from 'mongoose';
import { buildSort, escapeRegex, isValidId } from '../../DB/dbHelpers';
import { TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import {
	OrderStatus,
	PaymentStatus,
	TOrder,
	TOrderFilters,
	TOrderStatusHistoryEntry,
	TPricingHistoryEntry
} from './order.interfaces';
import { Order, TOrderDocument } from './order.model';
import { generateOrderNumber } from './order.utils';

const toOrder = (doc: TOrderDocument): TOrder => ({
	id: String(doc._id),
	orderNumber: doc.orderNumber,
	userId: doc.user ? String(doc.user) : undefined,
	customer: doc.customer,
	shippingAddress: doc.shippingAddress,
	items: (doc.items ?? []).map((item) => ({
		...item,
		variant: item.variant
			? {
					...item.variant,
					attributes:
						item.variant.attributes instanceof Map
							? Object.fromEntries(item.variant.attributes)
							: item.variant.attributes
				}
			: undefined
	})),
	subtotal: doc.subtotal,
	discount: doc.discount ?? 0,
	manualDiscount: doc.manualDiscount ?? 0,
	deliveryCharge: doc.deliveryCharge ?? 0,
	deliveryChargeOverridden: doc.deliveryChargeOverridden ?? false,
	deliveryArea: doc.deliveryArea,
	total: doc.total,
	paymentMethod: doc.paymentMethod,
	paymentStatus: doc.paymentStatus,
	paymentId: doc.payment ? String(doc.payment) : undefined,
	status: doc.status,
	statusHistory: doc.statusHistory ?? [],
	pricingHistory: doc.pricingHistory ?? [],
	customerNotes: doc.customerNotes,
	adminNotes: doc.adminNotes,
	stockRestored: doc.stockRestored ?? false,
	cancellationReason: doc.cancellationReason,
	confirmedAt: doc.confirmedAt,
	deliveredAt: doc.deliveredAt,
	cancelledAt: doc.cancelledAt,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const buildQuery = (filters: TOrderFilters): FilterQuery<TOrderDocument> => {
	const query: FilterQuery<TOrderDocument> = {};

	if (filters.status) query.status = filters.status;
	if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
	if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
	if (filters.userId && isValidId(filters.userId)) query.user = filters.userId;

	if (filters.from || filters.to) {
		const range: Record<string, Date> = {};
		if (filters.from) range.$gte = filters.from;
		if (filters.to) range.$lte = filters.to;
		query.createdAt = range;
	}

	if (filters.search) {
		const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = [
			{ orderNumber: regex },
			{ 'customer.name': regex },
			{ 'customer.phone': regex },
			{ 'customer.email': regex }
		];
	}

	return query;
};

type TCreateOrderData = Omit<TOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'paymentId'> & {
	orderNumber?: string;
};

const create = async (payload: TCreateOrderData): Promise<TOrder> => {
	const { userId, ...rest } = payload;

	// order numbers are unique - retry on the (very unlikely) collision
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			const created = await Order.create({
				...rest,
				user: userId,
				orderNumber: payload.orderNumber ?? generateOrderNumber()
			});
			return toOrder(created.toObject() as TOrderDocument);
		} catch (error) {
			const isDuplicate = (error as { code?: number })?.code === 11000;
			if (!isDuplicate || attempt === 4) throw error;
		}
	}

	throw new Error('Failed to generate a unique order number');
};

const findById = async (id: string): Promise<TOrder | null> => {
	if (!isValidId(id)) return null;
	const found = await Order.findById(id).lean();
	return found ? toOrder(found as TOrderDocument) : null;
};

const findByOrderNumber = async (orderNumber: string): Promise<TOrder | null> => {
	const found = await Order.findOne({ orderNumber: orderNumber.toUpperCase() }).lean();
	return found ? toOrder(found as TOrderDocument) : null;
};

const findMany = async (filters: TOrderFilters, pagination: TPaginationOptions): Promise<TPaginatedResult<TOrder>> => {
	const query = buildQuery(filters);
	const [rows, total] = await Promise.all([
		Order.find(query)
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Order.countDocuments(query)
	]);
	return { data: rows.map((row) => toOrder(row as TOrderDocument)), meta: buildMeta(pagination, total) };
};

type TStatusUpdate = {
	status: OrderStatus;
	historyEntry: TOrderStatusHistoryEntry;
	stockRestored?: boolean;
	cancellationReason?: string;
	paymentStatus?: PaymentStatus;
	confirmedAt?: Date;
	deliveredAt?: Date;
	cancelledAt?: Date;
};

const updateStatus = async (id: string, update: TStatusUpdate): Promise<TOrder | null> => {
	if (!isValidId(id)) return null;
	const { historyEntry, ...fields } = update;

	const updated = await Order.findByIdAndUpdate(
		id,
		{ $set: fields, $push: { statusHistory: historyEntry } },
		{ new: true, runValidators: true }
	).lean();
	return updated ? toOrder(updated as TOrderDocument) : null;
};

type TPricingUpdate = {
	manualDiscount: number;
	deliveryCharge: number;
	deliveryChargeOverridden: boolean;
	total: number;
	historyEntry: TPricingHistoryEntry;
};

/** Writes the recalculated amounts and appends the audit entry in one atomic update. */
const updatePricing = async (id: string, update: TPricingUpdate): Promise<TOrder | null> => {
	if (!isValidId(id)) return null;
	const { historyEntry, ...fields } = update;

	const updated = await Order.findByIdAndUpdate(
		id,
		{ $set: fields, $push: { pricingHistory: historyEntry } },
		{ new: true, runValidators: true }
	).lean();
	return updated ? toOrder(updated as TOrderDocument) : null;
};

const updatePaymentStatus = async (id: string, paymentStatus: PaymentStatus): Promise<TOrder | null> => {
	if (!isValidId(id)) return null;
	const updated = await Order.findByIdAndUpdate(id, { paymentStatus }, { new: true }).lean();
	return updated ? toOrder(updated as TOrderDocument) : null;
};

const attachPayment = async (id: string, paymentId: string): Promise<void> => {
	if (!isValidId(id) || !isValidId(paymentId)) return;
	await Order.updateOne({ _id: id }, { payment: paymentId });
};

const updateAdminNotes = async (id: string, adminNotes: string): Promise<TOrder | null> => {
	if (!isValidId(id)) return null;
	const updated = await Order.findByIdAndUpdate(id, { adminNotes }, { new: true }).lean();
	return updated ? toOrder(updated as TOrderDocument) : null;
};

const remove = async (id: string): Promise<void> => {
	if (!isValidId(id)) return;
	await Order.deleteOne({ _id: id });
};

// ---------------------------------------------------------------------------
// statistics
// ---------------------------------------------------------------------------

const count = async (filters: TOrderFilters = {}): Promise<number> => Order.countDocuments(buildQuery(filters));

const countByStatus = async (): Promise<Record<string, number>> => {
	const rows = await Order.aggregate<{ _id: OrderStatus; count: number }>([
		{ $group: { _id: '$status', count: { $sum: 1 } } }
	]);
	return rows.reduce<Record<string, number>>((acc, row) => {
		acc[row._id] = row.count;
		return acc;
	}, {});
};

/** Revenue only counts money that was actually verified as received. */
const sumRevenue = async (from?: Date): Promise<number> => {
	const match: FilterQuery<TOrderDocument> = {
		paymentStatus: PaymentStatus.Verified,
		status: { $ne: OrderStatus.Cancelled }
	};
	if (from) match.createdAt = { $gte: from };

	const rows = await Order.aggregate<{ total: number }>([
		{ $match: match },
		{ $group: { _id: null, total: { $sum: '$total' } } }
	]);
	return rows[0]?.total ?? 0;
};

const findRecent = async (limit = 5): Promise<TOrder[]> => {
	const rows = await Order.find().sort({ createdAt: -1 }).limit(limit).lean();
	return rows.map((row) => toOrder(row as TOrderDocument));
};

/** Used to make sure a review comes from a real, delivered purchase. */
const hasDeliveredPurchase = async (userId: string, productId: string): Promise<boolean> => {
	if (!isValidId(userId) || !isValidId(productId)) return false;
	const found = await Order.exists({
		user: userId,
		status: OrderStatus.Delivered,
		'items.product.productId': productId
	});
	return Boolean(found);
};

const OrderRepository = {
	create,
	findById,
	findByOrderNumber,
	findMany,
	updateStatus,
	updatePricing,
	updatePaymentStatus,
	attachPayment,
	updateAdminNotes,
	remove,
	count,
	countByStatus,
	sumRevenue,
	findRecent,
	hasDeliveredPurchase
};

export default OrderRepository;
