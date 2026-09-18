import { z } from 'zod';
import { normalizeBdPhone } from '../../utils/phone';
import { phoneSchema } from '../Auth/auth.validations';
import { DeliveryArea } from '../Delivery/delivery.interfaces';
import { OrderStatus, PaymentMethod } from './order.interfaces';

/**
 * Accepts the shapes a Bangladeshi customer actually types - `+8801712345678`,
 * `880 1712 345678`, `01712-345678` - and stores the canonical `01XXXXXXXXX`.
 */
const bdPhoneSchema = z
	.string({ required_error: 'Mobile number is required!' })
	.transform((value) => normalizeBdPhone(value) ?? value)
	.pipe(phoneSchema);

/** Exactly two areas. Legacy spellings are folded onto the canonical value. */
const deliveryAreaSchema = z
	.string({ required_error: 'Delivery area is required!' })
	.transform((value) =>
		value
			.trim()
			.toUpperCase()
			.replace(/[\s-]+/g, '_')
	)
	.pipe(
		z.nativeEnum(DeliveryArea, {
			errorMap: () => ({ message: 'Delivery area must be INSIDE_DHAKA or OUTSIDE_DHAKA!' })
		})
	);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID!');

const checkoutItemSchema = z.object({
	productId: objectId,
	variantId: objectId.optional(),
	quantity: z
		.number({ required_error: 'Quantity is required!' })
		.int('Quantity must be a whole number!')
		.positive('Quantity must be greater than 0!')
});

/**
 * Checkout collects Name, Mobile, Full address and Delivery area - nothing else is required.
 * `name` and `phone` here are optional: the server copies them from `customer` when absent,
 * so the frontend never has to send the same value twice.
 */
const shippingAddressSchema = z.object({
	name: z.string().min(2, 'Name is too short!').optional(),
	phone: bdPhoneSchema.optional(),
	email: z.string().email('Invalid email address!').optional(),
	address: z.string({ required_error: 'Full address is required!' }).min(5, 'Address is too short!'),
	deliveryNotes: z.string().max(500, 'Delivery notes are too long!').optional()
});

const previewCheckoutValidation = z.object({
	body: z.object({
		source: z.enum(['cart', 'direct']).optional(),
		items: z.array(checkoutItemSchema).min(1, 'At least one item is required!').optional(),
		// optional here: the storefront previews the basket before the area is chosen
		deliveryArea: deliveryAreaSchema.optional()
	})
});

/**
 * The only required inputs are: customer.name, customer.phone, shippingAddress.address
 * and deliveryArea. `paymentMethod` is accepted for backwards compatibility but ignored -
 * the server always stores cash on delivery.
 */
const createOrderValidation = z.object({
	body: z.object({
		source: z.enum(['cart', 'direct']).optional(),
		items: z.array(checkoutItemSchema).min(1, 'At least one item is required!').optional(),
		customer: z.object({
			name: z.string({ required_error: 'Name is required!' }).min(2, 'Name is too short!'),
			phone: bdPhoneSchema,
			email: z.string().email('Invalid email address!').optional()
		}),
		shippingAddress: shippingAddressSchema,
		deliveryArea: deliveryAreaSchema,
		// ignored by the server; kept so older clients do not break
		paymentMethod: z.nativeEnum(PaymentMethod).optional(),
		// ignored for pricing; only compared against the server total and logged on mismatch
		expectedTotal: z.number().nonnegative('Total cannot be negative!').optional(),
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
		phone: bdPhoneSchema
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
