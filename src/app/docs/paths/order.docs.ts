import { OrderStatus, PaymentMethod, PaymentStatus } from '../../modules/Order/order.interfaces';
import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Orders';

const shippingAddressExample = {
	name: 'Ayesha Rahman',
	phone: '01712345678',
	address: 'House 12, Road 4, Dhanmondi, Dhaka 1209',
	deliveryNotes: 'Call before delivery'
};

const createOrderExample = {
	source: 'direct',
	items: [{ productId: '6650f1a2b3c4d5e6f7a8b9c0', variantId: '6650f1a2b3c4d5e6f7a8b9d1', quantity: 2 }],
	customer: { name: 'Ayesha Rahman', phone: '01712345678', email: 'ayesha@example.com' },
	shippingAddress: shippingAddressExample,
	deliveryArea: 'inside-dhaka',
	paymentMethod: PaymentMethod.Bkash,
	customerNotes: 'Gift wrap please'
};

const orderListFilters = [
	parameterRef('Page'),
	parameterRef('Limit'),
	parameterRef('SortBy'),
	parameterRef('SortOrder'),
	{
		name: 'search',
		in: 'query' as const,
		description: 'Matches order number, customer name, phone or email.',
		required: false,
		schema: { type: 'string' as const },
		example: 'BS-260309-A1B2C3'
	},
	{
		name: 'status',
		in: 'query' as const,
		description: 'Filter by order status.',
		required: false,
		schema: { type: 'string' as const, enum: Object.values(OrderStatus) }
	},
	{
		name: 'paymentStatus',
		in: 'query' as const,
		description: 'Filter by payment status.',
		required: false,
		schema: { type: 'string' as const, enum: Object.values(PaymentStatus) }
	},
	{
		name: 'paymentMethod',
		in: 'query' as const,
		description: 'Filter by payment method.',
		required: false,
		schema: { type: 'string' as const, enum: Object.values(PaymentMethod) }
	},
	{
		name: 'from',
		in: 'query' as const,
		description: 'Only orders created on or after this date.',
		required: false,
		schema: { type: 'string' as const, format: 'date-time' },
		example: '2026-03-01T00:00:00.000Z'
	},
	{
		name: 'to',
		in: 'query' as const,
		description: 'Only orders created on or before this date.',
		required: false,
		schema: { type: 'string' as const, format: 'date-time' }
	}
];

export const orderPaths: TPathsObject = {
	'/api/orders/checkout/preview': {
		post: {
			tags: ['Checkout'],
			summary: 'Preview checkout totals',
			description:
				'**Public or Customer.** Recalculates the order summary before the customer confirms: item prices, discounts, the delivery charge for the selected area and the grand total. Send `source: "cart"` (logged-in) or an explicit `items` array (Buy Now / guest). Nothing sent by the client influences the amounts.',
			operationId: 'previewCheckout',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('CheckoutPreviewRequest'),
						examples: {
							cart: { summary: 'Logged-in customer cart', value: { source: 'cart', deliveryArea: 'inside-dhaka' } },
							buyNow: {
								summary: 'Buy Now / guest',
								value: {
									items: [
										{ productId: '6650f1a2b3c4d5e6f7a8b9c0', variantId: '6650f1a2b3c4d5e6f7a8b9d1', quantity: 2 }
									],
									deliveryArea: 'outside-dhaka'
								}
							}
						}
					}
				}
			},
			responses: {
				'200': successResponse('Checkout summary calculated successfully!', ref('CheckoutSummary'), {
					example: {
						success: true,
						message: 'Checkout summary calculated successfully!',
						data: {
							items: [
								{
									productId: '6650f1a2b3c4d5e6f7a8b9c0',
									variantId: '6650f1a2b3c4d5e6f7a8b9d1',
									name: 'Premium Jersey Hijab',
									variantLabel: 'Black / Free',
									quantity: 2,
									listPrice: 850,
									unitPrice: 720,
									subtotal: 1440
								}
							],
							subtotal: 1700,
							discount: 260,
							deliveryCharge: 60,
							deliveryArea: 'inside-dhaka',
							isFreeDelivery: false,
							total: 1500
						}
					}
				}),
				'400': responseRef('BadRequest'),
				'401': {
					description: 'A cart checkout was requested without a customer token.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'409': responseRef('Conflict'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/checkout': {
		post: {
			tags: ['Checkout'],
			summary: 'Place an order',
			description:
				'**Public or Customer.** Creates an order from the cart (`source: "cart"`), from an explicit item list (Buy Now) or as a guest without an account. Business rules: every price, discount, delivery charge and total is recalculated server side; stock is validated and reserved atomically so concurrent orders cannot oversell; product and variant snapshots are stored on the order. The order starts as `pending` with payment status `pending`, and the response contains the payment instructions for the chosen method. A cart based checkout clears the cart. Rate limited.',
			operationId: 'createOrder',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('CreateOrderRequest'),
						examples: {
							guestBkash: { summary: 'Guest checkout with bKash', value: createOrderExample },
							cartCod: {
								summary: 'Logged-in cart checkout with cash on delivery',
								value: {
									source: 'cart',
									customer: { name: 'Ayesha Rahman', phone: '01712345678', email: 'ayesha@example.com' },
									shippingAddress: shippingAddressExample,
									deliveryArea: 'inside-dhaka',
									paymentMethod: PaymentMethod.CashOnDelivery
								}
							}
						}
					}
				}
			},
			responses: {
				'201': successResponse('Order placed successfully!', ref('CreateOrderResult')),
				'400': {
					description: 'Validation failed, the cart is empty or a variant selection is missing.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'401': {
					description: 'A cart checkout was requested without a customer token.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'409': {
					description: 'Insufficient stock - another order took the last units.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: '"Premium Jersey Hijab" just went out of stock. Please review your order.',
								errorSources: [
									{ path: '', message: '"Premium Jersey Hijab" just went out of stock. Please review your order.' }
								]
							}
						}
					}
				},
				'429': responseRef('TooManyRequests'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/track': {
		post: {
			tags: [TAG],
			summary: 'Track an order',
			description:
				'**Public.** Guest order tracking. The phone number must match the one used at checkout, otherwise 404 is returned.',
			operationId: 'trackOrder',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('TrackOrderRequest'),
						example: { orderNumber: 'BS-260309-A1B2C3', phone: '01712345678' }
					}
				}
			},
			responses: {
				'200': successResponse('Order retrieved successfully!', ref('Order')),
				'400': responseRef('BadRequest'),
				'404': {
					description: 'No order matches this order number and phone number.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/my-orders': {
		get: {
			tags: [TAG],
			summary: 'List my orders',
			description:
				'**Customer.** Paginated list of the authenticated customer orders. Supports the same filters as the admin list.',
			operationId: 'getMyOrders',
			security: bearerAuth,
			parameters: orderListFilters,
			responses: {
				'200': listResponse('Orders retrieved successfully!', ref('Order')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders': {
		get: {
			tags: [TAG, 'Admin'],
			summary: 'List all orders',
			description: '**Admin.** Paginated order list with search and filters for the admin panel.',
			operationId: 'getOrders',
			security: bearerAuth,
			parameters: orderListFilters,
			responses: {
				'200': listResponse('Orders retrieved successfully!', ref('Order')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}': {
		get: {
			tags: [TAG],
			summary: 'Get an order',
			description: '**Customer (own order) or Admin.** Guests use `POST /api/orders/track` instead.',
			operationId: 'getOrderById',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('Order retrieved successfully!', ref('Order')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}/payment-instructions': {
		get: {
			tags: [TAG, 'Payments'],
			summary: 'Get payment instructions for an order',
			description:
				'**Customer (own order) or Admin.** Returns the merchant number, account type, payable amount and step by step instructions for the order payment method.',
			operationId: 'getOrderPaymentInstructions',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('Payment instructions retrieved successfully!', ref('PaymentInstructions')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}/status': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Update the order status',
			description:
				'**Admin.** Allowed transitions: `pending → confirmed → processing → shipped → delivered`, plus `pending`, `confirmed` or `processing` → `cancelled`. Any other transition is rejected with 400. Cancelling restores the reserved stock. Marking a cash on delivery order as `delivered` also sets its payment status to `verified`; the payment status of wallet orders is never changed here.',
			operationId: 'updateOrderStatus',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateOrderStatusRequest'),
						example: { status: OrderStatus.Confirmed, note: 'Confirmed over phone' }
					}
				}
			},
			responses: {
				'200': successResponse('Order status updated to confirmed successfully!', ref('Order')),
				'400': {
					description: 'Invalid status transition or the order is already in that status.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'An order cannot go from "pending" to "shipped".',
								errorSources: [{ path: '', message: 'An order cannot go from "pending" to "shipped".' }]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}/pricing': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Adjust the order pricing',
			description:
				'**Admin.** Applies a negotiated price to an existing order: an absolute `manualDiscount` on top of the item level discount, and/or a `deliveryCharge` for this order only (`resetDelivery: true` drops that override and re-resolves the charge from the delivery settings). ' +
				'The total is always recalculated on the server as `subtotal - discount - manualDiscount + deliveryCharge`; sending `total`, `subtotal` or `discount` is rejected with 400. The derived item `discount` is never overwritten, so it stays auditable. Every adjustment appends an entry to `pricingHistory` with the admin id, the previous and new total, and the note. ' +
				'Pricing is final once an order is `delivered` or `cancelled` (400). If the payment is already `verified` and the new total is lower, the adjustment is still applied and `refundDue` reports what the customer overpaid - record the refund itself with `PATCH /api/payments/{id}/refund`. While a payment is not yet verified its payable amount follows the new total, so `GET /api/orders/{id}/payment-instructions` shows the adjusted amount.',
			operationId: 'adjustOrderPricing',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('AdjustOrderPricingRequest'),
						examples: {
							negotiatedDiscount: {
								summary: 'Honour a negotiated price',
								value: { manualDiscount: 250, note: 'Negotiated over phone' }
							},
							waiveDelivery: {
								summary: 'Waive the delivery charge for this order',
								value: { deliveryCharge: 0, note: 'Goodwill - late delivery' }
							},
							resetDelivery: {
								summary: 'Go back to the area delivery charge',
								value: { resetDelivery: true }
							}
						}
					}
				}
			},
			responses: {
				'200': successResponse('Order pricing updated successfully!', ref('OrderPricingResult')),
				'400': {
					description:
						'Empty body, an unknown field such as `total`, both `deliveryCharge` and `resetDelivery`, a negative amount, a manual discount larger than the item total, a resulting total below 0, or an order that is already delivered or cancelled.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'A manual discount of 2000 exceeds the item total of 1440 for this order.',
								errorSources: [
									{ path: '', message: 'A manual discount of 2000 exceeds the item total of 1440 for this order.' }
								]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}/notes': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Save an internal order note',
			description:
				'**Admin.** Internal note stored on the order. It is returned with the order for both admin and customer.',
			operationId: 'updateOrderAdminNotes',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('AdminNotesRequest'),
						example: { adminNotes: 'Customer requested evening delivery' }
					}
				}
			},
			responses: {
				'200': successResponse('Order note saved successfully!', ref('Order')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/orders/{id}/cancel': {
		patch: {
			tags: [TAG],
			summary: 'Cancel an order',
			description:
				'**Customer (own order) or Admin.** Customers may cancel only while the order is `pending` or `confirmed`; admins may also cancel a `processing` order. Shipped and delivered orders can never be cancelled. Reserved stock is returned to inventory. The payment status is not changed - use the refund endpoint for a verified payment.',
			operationId: 'cancelOrder',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: false,
				content: {
					'application/json': { schema: ref('CancelOrderRequest'), example: { reason: 'Ordered the wrong colour' } }
				}
			},
			responses: {
				'200': successResponse('Order cancelled successfully!', ref('Order')),
				'400': {
					description: 'The order is already cancelled or has progressed too far to be cancelled.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'An order that is already shipped cannot be cancelled. Please contact support.',
								errorSources: [
									{ path: '', message: 'An order that is already shipped cannot be cancelled. Please contact support.' }
								]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	}
};
