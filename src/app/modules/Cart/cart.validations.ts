import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID!');

const addItemValidation = z.object({
	body: z.object({
		productId: objectId,
		variantId: objectId.optional(),
		quantity: z
			.number({ required_error: 'Quantity is required!' })
			.int('Quantity must be a whole number!')
			.positive('Quantity must be greater than 0!')
	})
});

const updateItemValidation = z.object({
	body: z.object({
		productId: objectId,
		variantId: objectId.optional(),
		quantity: z
			.number({ required_error: 'Quantity is required!' })
			.int('Quantity must be a whole number!')
			.positive('Quantity must be greater than 0!')
	})
});

const removeItemValidation = z.object({
	body: z.object({
		productId: objectId,
		variantId: objectId.optional()
	})
});

const CartValidations = {
	addItemValidation,
	updateItemValidation,
	removeItemValidation
};

export default CartValidations;
