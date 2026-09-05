import { PaymentMethod, PaymentStatus } from '../Order/order.interfaces';

export type TPaymentHistoryEntry = {
	status: PaymentStatus;
	at: Date;
	byId?: string;
	byRole?: string;
	note?: string;
};

export type TPayment = {
	id: string;
	orderId: string;
	orderNumber: string;
	method: PaymentMethod;
	amount: number;
	status: PaymentStatus;
	transactionId?: string;
	senderNumber?: string;
	/** Storage key only - the file is streamed through an authorised endpoint. */
	screenshotKey?: string;
	submittedAt?: Date;
	verifiedAt?: Date;
	verifiedById?: string;
	rejectionReason?: string;
	history: TPaymentHistoryEntry[];
	createdAt?: Date;
	updatedAt?: Date;
};

/** What leaves the API - the raw storage key is never exposed. */
export type TPaymentView = Omit<TPayment, 'screenshotKey'> & {
	hasScreenshot: boolean;
	screenshotUrl?: string;
};

export type TSubmitPaymentPayload = {
	transactionId: string;
	senderNumber?: string;
};

export type TVerifyPaymentPayload = {
	note?: string;
};

export type TRejectPaymentPayload = {
	rejectionReason: string;
};

export type TPaymentFilters = {
	status?: PaymentStatus;
	method?: PaymentMethod;
	search?: string;
};
