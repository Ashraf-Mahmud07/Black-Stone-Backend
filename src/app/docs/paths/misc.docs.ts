import { TPathsObject, bearerAuth, ref, responseRef, successResponse } from '../types';

/** Delivery, Admin dashboard, System and the health check. */

export const deliveryPaths: TPathsObject = {
	'/api/delivery/settings': {
		get: {
			tags: ['Delivery'],
			summary: 'Get delivery settings',
			description:
				'**Public.** Delivery areas and charges used at checkout. Send an area `key` as `deliveryArea` when placing an order. Until an admin saves the settings, the values come from the server environment configuration.',
			operationId: 'getDeliverySettings',
			security: [], // public endpoint
			responses: {
				'200': successResponse('Delivery settings retrieved successfully!', ref('DeliverySetting'), {
					example: {
						success: true,
						message: 'Delivery settings retrieved successfully!',
						data: {
							defaultCharge: 130,
							freeDeliveryEnabled: false,
							freeDeliveryThreshold: 3000,
							areas: [
								{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 60, estimatedDays: '1-2 days', isActive: true },
								{ key: 'outside-dhaka', name: 'Outside Dhaka', charge: 130, estimatedDays: '3-5 days', isActive: true }
							],
							note: 'Delivery charges are collected with the order total.'
						}
					}
				}),
				'500': responseRef('ServerError')
			}
		},
		patch: {
			tags: ['Delivery', 'Admin'],
			summary: 'Update delivery settings',
			description:
				'**Admin.** Partial update of the delivery configuration. Area keys must be unique, and a `freeDeliveryThreshold` is required when free delivery is enabled. Delivery pricing is never hardcoded - checkout always reads these values.',
			operationId: 'updateDeliverySettings',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateDeliverySettingRequest'),
						example: {
							defaultCharge: 130,
							freeDeliveryEnabled: true,
							freeDeliveryThreshold: 3000,
							areas: [
								{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 60, estimatedDays: '1-2 days', isActive: true },
								{ key: 'outside-dhaka', name: 'Outside Dhaka', charge: 130, estimatedDays: '3-5 days', isActive: true }
							]
						}
					}
				}
			},
			responses: {
				'200': successResponse('Delivery settings updated successfully!', ref('DeliverySetting')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	}
};

export const adminPaths: TPathsObject = {
	'/api/admin/dashboard': {
		get: {
			tags: ['Admin'],
			summary: 'Dashboard statistics',
			description:
				'**Admin.** Aggregated numbers for the admin home screen: orders by status, customers, products with low stock, pending reviews, payments awaiting verification, revenue (verified payments only, total and last 30 days), the five most recent orders and the ten lowest-stock products.',
			operationId: 'getDashboardStats',
			security: bearerAuth,
			responses: {
				'200': successResponse('Dashboard statistics retrieved successfully!', ref('DashboardStats')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/admin/login': {
		post: {
			tags: ['Admin', 'Auth'],
			summary: 'Admin login (legacy alias)',
			description:
				'**Public.** Kept for backwards compatibility - identical to `POST /api/auth/admin/login`, which is the canonical endpoint. Rate limited.',
			operationId: 'adminLoginAlias',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('LoginRequest'),
						example: { email: 'admin@blackstone.test', password: 'ChangeMe1234' }
					}
				}
			},
			responses: {
				'200': successResponse('Admin logged in successfully!', ref('AuthTokens')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'429': responseRef('TooManyRequests'),
				'500': responseRef('ServerError')
			}
		}
	}
};

export const systemPaths: TPathsObject = {
	'/api/system/mail-to-company': {
		post: {
			tags: ['System'],
			summary: 'Send a claim investment email',
			description:
				'**Public.** Internal utility endpoint inherited from the boilerplate: renders the claim investment template and emails it to the configured company address. It is not part of the storefront flow.',
			operationId: 'mailToCompany',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('MailToCompanyRequest'),
						example: {
							name: 'Ayesha Rahman',
							mobile: '01712345678',
							actual_amount: 50000,
							due_amount: 15000,
							reference: 'REF-2026-014',
							investment_type: 'ips'
						}
					}
				}
			},
			responses: {
				'200': successResponse('Mail sent successfully!', {
					type: 'object',
					properties: { message: { type: 'string', example: 'Mail sent successfully!' } }
				}),
				'400': responseRef('BadRequest'),
				'500': responseRef('ServerError')
			}
		}
	}
};

export const healthPaths: TPathsObject = {
	'/': {
		get: {
			tags: ['System'],
			summary: 'Health check',
			description: '**Public.** Simple liveness probe. Returns a plain object without the standard response envelope.',
			operationId: 'healthCheck',
			security: [], // public endpoint
			responses: {
				'200': {
					description: 'The server is running.',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									success: { type: 'boolean', example: true },
									message: { type: 'string', example: 'The server is running' }
								},
								required: ['success', 'message']
							},
							example: { success: true, message: 'The server is running' }
						}
					}
				}
			}
		}
	}
};
