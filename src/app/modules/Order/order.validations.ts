import { z } from 'zod';
import { phoneSchema } from '../Auth/auth.validations';
import { OrderStatus, PaymentMethod } from './order.interfaces';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID!');

const checkoutItemSchema = z.object({
	productId: objectId,
	variantId: objectId.optional(),
	quantity: z
		.number({ required_error: 'Quantity is required!' })
		.int('Quantity must be a whole number!')
		.positive('Quantity must be greater than 0!')
});

const shippingAddressSchema = z.object({
	name: z.string({ required_error: 'Recipient name is required!' }).min(2, 'Name is too short!'),
	phone: phoneSchema,
	email: z.string().email('Invalid email address!').optional(),
	address: z.string({ required_error: 'Address is required!' }).min(5, 'Address is too short!'),
	deliveryNotes: z.string().max(500, 'Delivery notes are too long!').optional()
});

const previewCheckoutValidation = z.object({
	body: z.object({
		source: z.enum(['cart', 'direct']).optional(),
		items: z.array(checkoutItemSchema).min(1, 'At least one item is required!').optional(),
		deliveryArea: z.string().optional()
	})
});

const createOrderValidation = z.object({
	body: z.object({
		source: z.enum(['cart', 'direct']).optional(),
		items: z.array(checkoutItemSchema).min(1, 'At least one item is required!').optional(),
		customer: z.object({
			name: z.string({ required_error: 'Customer name is required!' }).min(2, 'Name is too short!'),
			phone: phoneSchema,
			email: z.string().email('Invalid email address!').optional()
		}),
		shippingAddress: shippingAddressSchema,
		deliveryArea: z.string().optional(),
		paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Payment method is required!' }),
		customerNotes: z.string().max(500, 'Notes are too long!').optional()
	})
});

const updateOrderStatusValidation = z.object({
	body: z.object({
		status: z.nativeEnum(OrderStatus, { required_error: 'Status is required!' }),
		note: z.string().max(500, 'Note is too long!').optional()
	})
});

const cancelOrderValidation = z.object({
	body: z.object({
		reason: z.string().max(500, 'Reason is too long!').optional()
	})
});

const adminNotesValidation = z.object({
	body: z.object({
		adminNotes: z.string({ required_error: 'Note is required!' }).max(1000, 'Note is too long!')
	})
});

/**
 * `.strict()` rejects anything not listed here - notably a client supplied `total`,
 * `subtotal` or `discount`. Amounts are only ever calculated on the server.
 */
const adjustPricingValidation = z.object({
	body: z
		.object({
			manualDiscount: z
				.number({ invalid_type_error: 'Manual discount must be a number!' })
				.nonnegative('Manual discount cannot be negative!')
				.optional(),
			deliveryCharge: z
				.number({ invalid_type_error: 'Delivery charge must be a number!' })
				.nonnegative('Delivery charge cannot be negative!')
				.optional(),
			resetDelivery: z.boolean().optional(),
			note: z.string().max(500, 'Note is too long!').optional()
		})
		.strict()
		.refine((body) => !(body.deliveryCharge !== undefined && body.resetDelivery === true), {
			message: 'Send either a deliveryCharge or resetDelivery, not both!',
			path: ['deliveryCharge']
		})
		.refine(
			(body) => body.manualDiscount !== undefined || body.deliveryCharge !== undefined || body.resetDelivery === true,
			{
				message: 'Provide at least one of manualDiscount, deliveryCharge or resetDelivery!',
				path: ['manualDiscount']
			}
		)
});

const trackOrderValidation = z.object({
	body: z.object({
		orderNumber: z.string({ required_error: 'Order number is required!' }).min(4, 'Invalid order number!'),
		phone: phoneSchema
	})
});

const OrderValidations = {
	previewCheckoutValidation,
	createOrderValidation,
	updateOrderStatusValidation,
	cancelOrderValidation,
	adminNotesValidation,
	adjustPricingValidation,
	trackOrderValidation
};

export default OrderValidations;
