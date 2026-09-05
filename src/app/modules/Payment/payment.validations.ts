import { z } from 'zod';
import { phoneSchema } from '../Auth/auth.validations';

const submitPaymentValidation = z.object({
	body: z.object({
		transactionId: z
			.string({ required_error: 'Transaction ID is required!' })
			.trim()
			.min(6, 'Transaction ID is too short!')
			.max(40, 'Transaction ID is too long!'),
		senderNumber: phoneSchema.optional(),
		/** Required for guest orders so the submitter proves ownership of the order. */
		phone: phoneSchema.optional()
	})
});

const verifyPaymentValidation = z.object({
	body: z.object({
		note: z.string().max(500, 'Note is too long!').optional()
	})
});

const rejectPaymentValidation = z.object({
	body: z.object({
		rejectionReason: z
			.string({ required_error: 'A rejection reason is required!' })
			.min(5, 'Please describe why the payment was rejected!')
			.max(500, 'Reason is too long!')
	})
});

const refundPaymentValidation = z.object({
	body: z.object({
		note: z.string().max(500, 'Note is too long!').optional()
	})
});

const PaymentValidations = {
	submitPaymentValidation,
	verifyPaymentValidation,
	rejectPaymentValidation,
	refundPaymentValidation
};

export default PaymentValidations;
