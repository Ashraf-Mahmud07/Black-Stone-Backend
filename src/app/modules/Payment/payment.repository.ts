import { FilterQuery } from 'mongoose';
import { buildSort, escapeRegex, isValidId } from '../../DB/dbHelpers';
import { TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import { PaymentMethod, PaymentStatus } from '../Order/order.interfaces';
import { TPayment, TPaymentFilters, TPaymentHistoryEntry } from './payment.interfaces';
import { Payment, TPaymentDocument } from './payment.model';

const toPayment = (doc: TPaymentDocument): TPayment => ({
	id: String(doc._id),
	orderId: String(doc.order),
	orderNumber: doc.orderNumber,
	method: doc.method,
	amount: doc.amount,
	status: doc.status,
	transactionId: doc.transactionId,
	senderNumber: doc.senderNumber,
	screenshotKey: doc.screenshotKey,
	submittedAt: doc.submittedAt,
	verifiedAt: doc.verifiedAt,
	verifiedById: doc.verifiedBy,
	rejectionReason: doc.rejectionReason,
	history: doc.history ?? [],
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const buildQuery = (filters: TPaymentFilters): FilterQuery<TPaymentDocument> => {
	const query: FilterQuery<TPaymentDocument> = {};
	if (filters.status) query.status = filters.status;
	if (filters.method) query.method = filters.method;
	if (filters.search) {
		const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = [{ orderNumber: regex }, { transactionId: regex }, { senderNumber: regex }];
	}
	return query;
};

const create = async (payload: {
	orderId: string;
	orderNumber: string;
	method: PaymentMethod;
	amount: number;
	status: PaymentStatus;
}): Promise<TPayment> => {
	const created = await Payment.create({
		order: payload.orderId,
		orderNumber: payload.orderNumber,
		method: payload.method,
		amount: payload.amount,
		status: payload.status,
		history: [{ status: payload.status, at: new Date(), note: 'Payment record created' }]
	});
	return toPayment(created.toObject() as TPaymentDocument);
};

const findById = async (id: string): Promise<TPayment | null> => {
	if (!isValidId(id)) return null;
	const found = await Payment.findById(id).lean();
	return found ? toPayment(found as TPaymentDocument) : null;
};

const findByOrderId = async (orderId: string): Promise<TPayment | null> => {
	if (!isValidId(orderId)) return null;
	const found = await Payment.findOne({ order: orderId }).lean();
	return found ? toPayment(found as TPaymentDocument) : null;
};

const findByTransactionId = async (transactionId: string): Promise<TPayment | null> => {
	const found = await Payment.findOne({ transactionId: transactionId.toUpperCase() }).lean();
	return found ? toPayment(found as TPaymentDocument) : null;
};

const findMany = async (
	filters: TPaymentFilters,
	pagination: TPaginationOptions
): Promise<TPaginatedResult<TPayment>> => {
	const query = buildQuery(filters);
	const [rows, total] = await Promise.all([
		Payment.find(query)
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Payment.countDocuments(query)
	]);
	return { data: rows.map((row) => toPayment(row as TPaymentDocument)), meta: buildMeta(pagination, total) };
};

type TPaymentUpdate = Partial<
	Pick<
		TPayment,
		'status' | 'transactionId' | 'senderNumber' | 'screenshotKey' | 'submittedAt' | 'verifiedAt' | 'rejectionReason'
	>
> & { verifiedById?: string };

const update = async (
	id: string,
	payload: TPaymentUpdate,
	historyEntry: TPaymentHistoryEntry
): Promise<TPayment | null> => {
	if (!isValidId(id)) return null;
	const { verifiedById, ...rest } = payload;
	const fields: Record<string, unknown> = { ...rest };
	if (verifiedById !== undefined) fields.verifiedBy = verifiedById;

	const updated = await Payment.findByIdAndUpdate(
		id,
		{ $set: fields, $push: { history: historyEntry } },
		{ new: true, runValidators: true }
	).lean();
	return updated ? toPayment(updated as TPaymentDocument) : null;
};

/**
 * Keeps the payable amount in step with an admin price adjustment. Only used while the
 * payment has not been verified - a verified payment record is never rewritten.
 */
const updateAmount = async (id: string, amount: number): Promise<TPayment | null> => {
	if (!isValidId(id)) return null;
	const updated = await Payment.findByIdAndUpdate(id, { amount }, { new: true, runValidators: true }).lean();
	return updated ? toPayment(updated as TPaymentDocument) : null;
};

const removeByOrderId = async (orderId: string): Promise<void> => {
	if (!isValidId(orderId)) return;
	await Payment.deleteOne({ order: orderId });
};

const count = async (filters: TPaymentFilters = {}): Promise<number> => Payment.countDocuments(buildQuery(filters));

const PaymentRepository = {
	create,
	findById,
	findByOrderId,
	findByTransactionId,
	findMany,
	update,
	updateAmount,
	removeByOrderId,
	count
};

export default PaymentRepository;
