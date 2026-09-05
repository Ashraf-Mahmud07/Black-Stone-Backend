import { TPathsObject, bearerAuth, ref, responseRef, successResponse } from '../types';

const TAG = 'Cart';

const cartExample = {
	success: true,
	message: 'Item added to cart successfully!',
	data: {
		items: [
			{
				productId: '6650f1a2b3c4d5e6f7a8b9c0',
				variantId: '6650f1a2b3c4d5e6f7a8b9d1',
				name: 'Premium Jersey Hijab',
				slug: 'premium-jersey-hijab',
				sku: 'HIJAB-JRSY01-BLK',
				variantLabel: 'Black / Free',
				quantity: 2,
				listPrice: 850,
				unitPrice: 720,
				lineTotal: 1440,
				availableStock: 25,
				isAvailable: true
			}
		],
		itemCount: 2,
		totals: { subtotal: 1700, discount: 260, itemsTotal: 1440 },
		hasIssues: false
	}
};

const businessRules =
	'Validated on every write: the product must exist and be `active`, a variant must be selected when the product has variants, the variant must be active, the quantity must be a positive whole number (max 50 per line) and stock must be sufficient. Prices are never taken from the client - they are recalculated from the product data on every read.';

export const cartPaths: TPathsObject = {
	'/api/cart': {
		get: {
			tags: [TAG],
			summary: 'Get my cart',
			description:
				'**Customer.** Returns the cart with server calculated prices and totals. Lines that can no longer be ordered are returned with `isAvailable: false` and an `issue` message instead of failing the request. Guests keep their cart on the frontend and check out with an explicit `items` array.',
			operationId: 'getCart',
			security: bearerAuth,
			responses: {
				'200': successResponse('Cart retrieved successfully!', ref('Cart'), { example: cartExample }),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Clear the cart',
			description: '**Customer.** Removes every line from the cart.',
			operationId: 'clearCart',
			security: bearerAuth,
			responses: {
				'200': successResponse('Cart cleared successfully!', ref('Cart')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/cart/items': {
		post: {
			tags: [TAG],
			summary: 'Add an item to the cart',
			description: `**Customer.** Adds a product/variant line, or increases the quantity of an existing line. ${businessRules}`,
			operationId: 'addCartItem',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('AddCartItemRequest'),
						example: {
							productId: '6650f1a2b3c4d5e6f7a8b9c0',
							variantId: '6650f1a2b3c4d5e6f7a8b9d1',
							quantity: 2
						}
					}
				}
			},
			responses: {
				'200': successResponse('Item added to cart successfully!', ref('Cart'), { example: cartExample }),
				'400': {
					description: 'Invalid payload, missing variant selection or more than 50 units requested.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'Please select a variant for "Premium Jersey Hijab".',
								errorSources: [{ path: '', message: 'Please select a variant for "Premium Jersey Hijab".' }]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'409': responseRef('Conflict'),
				'500': responseRef('ServerError')
			}
		},
		patch: {
			tags: [TAG],
			summary: 'Update a cart item quantity',
			description: `**Customer.** Replaces the quantity of one line. ${businessRules}`,
			operationId: 'updateCartItem',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateCartItemRequest'),
						example: {
							productId: '6650f1a2b3c4d5e6f7a8b9c0',
							variantId: '6650f1a2b3c4d5e6f7a8b9d1',
							quantity: 1
						}
					}
				}
			},
			responses: {
				'200': successResponse('Cart item updated successfully!', ref('Cart')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': {
					description: 'The item is not in the cart, or the product no longer exists.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'409': responseRef('Conflict'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Remove a cart item',
			description: '**Customer.** Removes one product/variant line from the cart.',
			operationId: 'removeCartItem',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('RemoveCartItemRequest'),
						example: { productId: '6650f1a2b3c4d5e6f7a8b9c0', variantId: '6650f1a2b3c4d5e6f7a8b9d1' }
					}
				}
			},
			responses: {
				'200': successResponse('Cart item removed successfully!', ref('Cart')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': {
					description: 'The item is not in the cart.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'500': responseRef('ServerError')
			}
		}
	}
};
