import { PaymentMethod, PaymentStatus } from '../../modules/Order/order.interfaces';
import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Payments';

const paymentExample = {
	id: '6650f1a2b3c4d5e6f7a8b9e0',
	orderId: '6650f1a2b3c4d5e6f7a8b9f0',
	orderNumber: 'BS-260309-A1B2C3',
	method: PaymentMethod.Bkash,
	amount: 1500,
	status: PaymentStatus.Submitted,
	transactionId: 'TRX9AB12CD34',
	senderNumber: '01712345678',
	hasScreenshot: true,
	screenshotUrl: '/api/payments/6650f1a2b3c4d5e6f7a8b9e0/screenshot',
	submittedAt: '2026-03-09T10:15:00.000Z',
	history: [
		{ status: PaymentStatus.Pending, at: '2026-03-09T10:10:00.000Z', note: 'Payment record created' },
		{
			status: PaymentStatus.Submitted,
			at: '2026-03-09T10:15:00.000Z',
			byRole: 'customer',
			note: 'Payment details submitted'
		}
	]
};

export const paymentPaths: TPathsObject = {
	'/api/payments/orders/{orderId}': {
		get: {
			tags: [TAG],
			summary: 'Get the payment of an order',
			description:
				'**Customer (own order), Admin or guest.** Guests must pass the order phone number as the `phone` query parameter. The screenshot storage key is never returned.',
			operationId: 'getPaymentByOrder',
			security: [], // public endpoint
			parameters: [
				parameterRef('OrderIdParam'),
				{
					name: 'phone',
					in: 'query',
					description: 'Required for guest orders - must match the phone number used at checkout.',
					required: false,
					schema: { type: 'string', pattern: '^(?:\\+?88)?01[3-9]\\d{8}$' },
					example: '01712345678'
				}
			],
			responses: {
				'200': successResponse('Payment retrieved successfully!', ref('Payment'), {
					example: { success: true, message: 'Payment retrieved successfully!', data: paymentExample }
				}),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/payments/orders/{orderId}/submit': {
		post: {
			tags: [TAG],
			summary: 'Submit bKash / Nagad payment details',
			description:
				'**Customer (own order), Admin or guest.** `multipart/form-data`. The customer sends the wallet transaction ID and optionally a screenshot (JPEG, PNG or WEBP, max 5MB). Business rules: only bKash and Nagad orders accept a submission - cash on delivery orders are rejected; transaction IDs must be unique across orders; a submission sets the payment status to `submitted`, which does **not** mean the payment is verified and does not change the order status; a rejected payment can be resubmitted; a verified payment cannot. Guests must include the order `phone` field. Rate limited.',
			operationId: 'submitPayment',
			security: [], // public endpoint
			parameters: [parameterRef('OrderIdParam')],
			requestBody: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: ref('SubmitPaymentUpload'),
						encoding: { screenshot: { contentType: 'image/jpeg, image/png, image/webp' } },
						example: { transactionId: 'TRX9AB12CD34', senderNumber: '01712345678', phone: '01712345678' }
					}
				}
			},
			responses: {
				'200': successResponse('Payment information submitted! Our team will verify it shortly.', ref('Payment'), {
					example: {
						success: true,
						message: 'Payment information submitted! Our team will verify it shortly.',
						data: paymentExample
					}
				}),
				'400': {
					description:
						'Validation failed, the order is cash on delivery or cancelled, or the payment is already verified.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'This order is a cash on delivery order - no transaction is required!',
								errorSources: [
									{ path: '', message: 'This order is a cash on delivery order - no transaction is required!' }
								]
							}
						}
					}
				},
				'403': {
					description: 'Not the owner of the order, or a wrong phone number was supplied for a guest order.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'409': {
					description: 'This transaction ID has already been used for another order.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'429': responseRef('TooManyRequests'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/payments': {
		get: {
			tags: [TAG, 'Admin'],
			summary: 'List payments',
			description:
				'**Admin.** Payment verification queue. Filter with `status=submitted` to see everything waiting for manual verification.',
			operationId: 'getPayments',
			security: bearerAuth,
			parameters: [
				parameterRef('Page'),
				parameterRef('Limit'),
				parameterRef('SortBy'),
				parameterRef('SortOrder'),
				{
					name: 'status',
					in: 'query',
					description: 'Filter by payment status.',
					required: false,
					schema: { type: 'string', enum: Object.values(PaymentStatus) },
					example: PaymentStatus.Submitted
				},
				{
					name: 'method',
					in: 'query',
					description: 'Filter by payment method.',
					required: false,
					schema: { type: 'string', enum: Object.values(PaymentMethod) }
				},
				{
					name: 'search',
					in: 'query',
					description: 'Matches order number, transaction ID or sender number.',
					required: false,
					schema: { type: 'string' }
				}
			],
			responses: {
				'200': listResponse('Payments retrieved successfully!', ref('Payment')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/payments/{id}/verify': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Verify a payment',
			description:
				'**Admin.** Marks the payment as `verified` after the transaction has been checked against the merchant statement, and mirrors the status onto the order. The order status is not changed - update it separately. Only `pending` or `submitted` payments can be verified.',
			operationId: 'verifyPayment',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: false,
				content: {
					'application/json': {
						schema: ref('VerifyPaymentRequest'),
						example: { note: 'Matched with the merchant statement' }
					}
				}
			},
			responses: {
				'200': successResponse('Payment verified successfully!', ref('Payment')),
				'400': {
					description: 'The payment cannot move to `verified` from its current status.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'A payment cannot go from "verified" to "verified".',
								errorSources: [{ path: '', message: 'A payment cannot go from "verified" to "verified".' }]
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

	'/api/payments/{id}/reject': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Reject a payment',
			description:
				'**Admin.** Marks a submitted payment as `rejected` and stores the reason, which is returned to the customer. The customer can then submit new payment details.',
			operationId: 'rejectPayment',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('RejectPaymentRequest'),
						example: { rejectionReason: 'Transaction ID not found in the merchant statement' }
					}
				}
			},
			responses: {
				'200': successResponse('Payment rejected!', ref('Payment')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/payments/{id}/refund': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Mark a payment as refunded',
			description:
				'**Admin.** Only a `verified` payment can be refunded. This records the refund in the payment history; the money is transferred manually outside the system.',
			operationId: 'refundPayment',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: false,
				content: {
					'application/json': { schema: ref('RefundPaymentRequest'), example: { note: 'Refunded via bKash on 09 Mar' } }
				}
			},
			responses: {
				'200': successResponse('Payment marked as refunded!', ref('Payment')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/payments/{id}/screenshot': {
		get: {
			tags: [TAG],
			summary: 'Download a payment screenshot',
			description:
				'**Admin or the customer who owns the order.** Screenshots are stored on Cloudinary as private (`authenticated`) assets and are never publicly reachable. Once the caller is authorised this endpoint answers with a 302 redirect to a signed delivery url, so follow redirects when fetching it.',
			operationId: 'getPaymentScreenshot',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'302': { description: 'Redirect to the signed, private Cloudinary url of the screenshot.' },
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': {
					description: 'No screenshot was submitted for this payment.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'500': responseRef('ServerError')
			}
		}
	}
};
