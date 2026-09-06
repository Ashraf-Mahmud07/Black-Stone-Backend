import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TAuthUser, UserRole } from '../../interface/auth';
import { TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import { storage, StorageFolders, TUploadedFile } from '../../utils/storage';
import { OrderStatus, PaymentMethod, PaymentStatus, TOrder } from '../Order/order.interfaces';
import OrderRepository from '../Order/order.repository';
import { isManualPaymentMethod } from '../Order/order.utils';
import { TPayment, TPaymentFilters, TPaymentView, TSubmitPaymentPayload } from './payment.interfaces';
import PaymentRepository from './payment.repository';

/** Allowed payment status transitions. */
const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
	[PaymentStatus.Pending]: [PaymentStatus.Submitted, PaymentStatus.Failed, PaymentStatus.Verified],
	[PaymentStatus.Submitted]: [PaymentStatus.Verified, PaymentStatus.Rejected, PaymentStatus.Failed],
	[PaymentStatus.Rejected]: [PaymentStatus.Submitted],
	[PaymentStatus.Verified]: [PaymentStatus.Refunded],
	[PaymentStatus.Failed]: [PaymentStatus.Submitted],
	[PaymentStatus.Refunded]: []
};

const assertTransition = (from: PaymentStatus, to: PaymentStatus): void => {
	if (!PAYMENT_STATUS_TRANSITIONS[from]?.includes(to)) {
		throw new AppError(httpStatus.BAD_REQUEST, `A payment cannot go from "${from}" to "${to}".`);
	}
};

/** The storage key never leaves the API. */
const toPaymentView = (payment: TPayment): TPaymentView => {
	const { screenshotKey, ...rest } = payment;
	return {
		...rest,
		hasScreenshot: Boolean(screenshotKey),
		screenshotUrl: screenshotKey ? `/api/payments/${payment.id}/screenshot` : undefined
	};
};

const loadOrderOrThrow = async (orderId: string): Promise<TOrder> => {
	const order = await OrderRepository.findById(orderId);
	if (!order) {
		throw new AppError(httpStatus.NOT_FOUND, 'Order not found!');
	}
	return order;
};

/**
 * Guests own their order through the phone number they checked out with,
 * logged-in customers through their user id.
 */
const assertOrderAccess = (order: TOrder, authUser?: TAuthUser, phone?: string): void => {
	if (authUser?.role === UserRole.Admin) return;
	if (order.userId) {
		if (authUser && order.userId === authUser.id) return;
		throw new AppError(httpStatus.FORBIDDEN, 'Access denied!');
	}
	if (phone && order.customer.phone.replace(/\s/g, '') === phone.replace(/\s/g, '')) return;
	throw new AppError(httpStatus.FORBIDDEN, 'Please provide the phone number used to place this order!');
};

const loadPaymentOrThrow = async (orderId: string): Promise<TPayment> => {
	const payment = await PaymentRepository.findByOrderId(orderId);
	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, 'Payment record not found for this order!');
	}
	return payment;
};

const getPaymentByOrder = async (orderId: string, authUser?: TAuthUser, phone?: string): Promise<TPaymentView> => {
	const order = await loadOrderOrThrow(orderId);
	assertOrderAccess(order, authUser, phone);
	return toPaymentView(await loadPaymentOrThrow(orderId));
};

/**
 * Customer submits a bKash/Nagad transaction id (and optionally a screenshot).
 * This only marks the payment as `submitted` - it never means the money arrived.
 */
const submitPayment = async (
	orderId: string,
	payload: TSubmitPaymentPayload & { phone?: string },
	file: TUploadedFile | undefined,
	authUser?: TAuthUser
): Promise<TPaymentView> => {
	const order = await loadOrderOrThrow(orderId);
	assertOrderAccess(order, authUser, payload.phone);

	if (!isManualPaymentMethod(order.paymentMethod)) {
		throw new AppError(httpStatus.BAD_REQUEST, 'This order is a cash on delivery order - no transaction is required!');
	}
	if (order.status === OrderStatus.Cancelled) {
		throw new AppError(httpStatus.BAD_REQUEST, 'This order has been cancelled!');
	}

	const payment = await loadPaymentOrThrow(orderId);
	if (payment.status === PaymentStatus.Verified) {
		throw new AppError(httpStatus.BAD_REQUEST, 'This payment has already been verified!');
	}
	assertTransition(payment.status, PaymentStatus.Submitted);

	const transactionId = payload.transactionId.trim().toUpperCase();
	const duplicate = await PaymentRepository.findByTransactionId(transactionId);
	if (duplicate && duplicate.id !== payment.id) {
		throw new AppError(httpStatus.CONFLICT, 'This transaction ID has already been used for another order!');
	}

	let screenshotKey = payment.screenshotKey;
	if (file) {
		// screenshots are stored privately - never in a publicly reachable location
		const stored = await storage.save(file, {
			folder: StorageFolders.payments,
			resourceType: 'image',
			visibility: 'private'
		});
		if (screenshotKey) await storage.remove(screenshotKey).catch(() => undefined);
		screenshotKey = stored.key;
	}

	const now = new Date();
	const updated = await PaymentRepository.update(
		payment.id,
		{
			status: PaymentStatus.Submitted,
			transactionId,
			senderNumber: payload.senderNumber,
			screenshotKey,
			submittedAt: now,
			rejectionReason: undefined
		},
		{ status: PaymentStatus.Submitted, at: now, byRole: authUser?.role ?? 'guest', note: 'Payment details submitted' }
	);

	await OrderRepository.updatePaymentStatus(orderId, PaymentStatus.Submitted);
	return toPaymentView(updated as TPayment);
};

const changeStatusByAdmin = async (
	paymentId: string,
	nextStatus: PaymentStatus,
	admin: TAuthUser,
	options: { note?: string; rejectionReason?: string } = {}
): Promise<TPaymentView> => {
	const payment = await PaymentRepository.findById(paymentId);
	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, 'Payment not found!');
	}
	assertTransition(payment.status, nextStatus);

	const now = new Date();
	const updated = await PaymentRepository.update(
		paymentId,
		{
			status: nextStatus,
			verifiedAt: nextStatus === PaymentStatus.Verified ? now : payment.verifiedAt,
			verifiedById: nextStatus === PaymentStatus.Verified ? admin.id : payment.verifiedById,
			rejectionReason: nextStatus === PaymentStatus.Rejected ? options.rejectionReason : undefined
		},
		{
			status: nextStatus,
			at: now,
			byId: admin.id,
			byRole: admin.role,
			note: options.rejectionReason ?? options.note
		}
	);

	// the order only mirrors the payment status - the order status is managed separately
	await OrderRepository.updatePaymentStatus(payment.orderId, nextStatus);
	return toPaymentView(updated as TPayment);
};

const verifyPayment = async (paymentId: string, admin: TAuthUser, note?: string): Promise<TPaymentView> =>
	changeStatusByAdmin(paymentId, PaymentStatus.Verified, admin, { note });

const rejectPayment = async (paymentId: string, admin: TAuthUser, rejectionReason: string): Promise<TPaymentView> =>
	changeStatusByAdmin(paymentId, PaymentStatus.Rejected, admin, { rejectionReason });

const refundPayment = async (paymentId: string, admin: TAuthUser, note?: string): Promise<TPaymentView> =>
	changeStatusByAdmin(paymentId, PaymentStatus.Refunded, admin, { note });

const getPayments = async (query: Record<string, unknown>): Promise<TPaginatedResult<TPaymentView>> => {
	const filters: TPaymentFilters = {
		status: typeof query.status === 'string' ? (query.status as PaymentStatus) : undefined,
		method: typeof query.method === 'string' ? (query.method as PaymentMethod) : undefined,
		search: typeof query.search === 'string' ? query.search : undefined
	};

	const { data, meta } = await PaymentRepository.findMany(filters, calculatePagination(query));
	return { data: data.map(toPaymentView), meta };
};

/**
 * Returns a signed, private Cloudinary url for the screenshot. Access is authorised here -
 * screenshots are stored as `authenticated` assets and are never publicly reachable.
 */
const getScreenshotUrl = async (paymentId: string, authUser: TAuthUser): Promise<string> => {
	const payment = await PaymentRepository.findById(paymentId);
	if (!payment?.screenshotKey) {
		throw new AppError(httpStatus.NOT_FOUND, 'No payment screenshot found!');
	}

	if (authUser.role !== UserRole.Admin) {
		const order = await loadOrderOrThrow(payment.orderId);
		assertOrderAccess(order, authUser);
	}

	return storage.locate(payment.screenshotKey);
};

const PaymentServices = {
	getPaymentByOrder,
	submitPayment,
	verifyPayment,
	rejectPayment,
	refundPayment,
	getPayments,
	getScreenshotUrl
};

export default PaymentServices;
