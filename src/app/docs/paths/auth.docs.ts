import { TPathsObject, bearerAuth, ref, responseRef, successResponse } from '../types';

const TAG = 'Auth';

export const authPaths: TPathsObject = {
	'/api/auth/register': {
		post: {
			tags: [TAG],
			summary: 'Register a customer',
			description:
				'**Public.** Creates a customer account and returns an access + refresh token pair. The refresh token is also set as an httpOnly `refreshToken` cookie. Rate limited.',
			operationId: 'register',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('RegisterRequest'),
						example: {
							name: 'Ayesha Rahman',
							email: 'ayesha@example.com',
							phone: '01712345678',
							password: 'Customer1234'
						}
					}
				}
			},
			responses: {
				'201': successResponse('Account registered successfully!', ref('AuthTokens')),
				'400': responseRef('BadRequest'),
				'409': {
					description: 'An account with this email already exists.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'An account with this email already exists!',
								errorSources: [{ path: '', message: 'An account with this email already exists!' }]
							}
						}
					}
				},
				'429': responseRef('TooManyRequests'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/auth/login': {
		post: {
			tags: [TAG],
			summary: 'Customer login',
			description: '**Public.** Returns an access + refresh token pair. Blocked accounts are rejected. Rate limited.',
			operationId: 'login',
			security: [], // public endpoint
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('LoginRequest'),
						example: { email: 'ayesha@example.com', password: 'Customer1234' }
					}
				}
			},
			responses: {
				'200': successResponse('Logged in successfully!', ref('AuthTokens')),
				'400': responseRef('BadRequest'),
				'401': {
					description: 'Invalid email or password.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'Invalid email or password!',
								errorSources: [{ path: '', message: 'Invalid email or password!' }]
							}
						}
					}
				},
				'403': {
					description: 'The account is blocked.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'429': responseRef('TooManyRequests'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/auth/admin/login': {
		post: {
			tags: [TAG],
			summary: 'Admin login',
			description:
				'**Public.** Authenticates an administrator. The returned token carries the `admin` role required by every admin endpoint. Rate limited.',
			operationId: 'loginAdmin',
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
	},

	'/api/auth/refresh-token': {
		post: {
			tags: [TAG],
			summary: 'Refresh the access token',
			description:
				'**Public.** Issues a new access token from the `refreshToken` cookie or from the token supplied in the body. Works for both customers and admins.',
			operationId: 'refreshToken',
			security: [], // public endpoint
			requestBody: {
				required: false,
				content: { 'application/json': { schema: ref('RefreshTokenRequest') } }
			},
			responses: {
				'200': successResponse('Access token refreshed successfully!', ref('AccessToken')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': {
					description: 'The account is no longer active.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/auth/me': {
		get: {
			tags: [TAG],
			summary: 'Get the current user',
			description: '**Customer or Admin.** Returns the profile that belongs to the access token.',
			operationId: 'getMe',
			security: bearerAuth,
			responses: {
				'200': successResponse('User retrieved successfully!', { oneOf: [ref('User'), ref('AdminUser')] }),
				'401': responseRef('Unauthorized'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/auth/change-password': {
		post: {
			tags: [TAG],
			summary: 'Change the password',
			description:
				'**Customer.** Verifies the current password before updating it. All previously issued tokens stop working, so the customer must log in again.',
			operationId: 'changePassword',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('ChangePasswordRequest'),
						example: { oldPassword: 'Customer1234', newPassword: 'NewCustomer5678' }
					}
				}
			},
			responses: {
				'200': successResponse('Password changed successfully! Please login again.', {
					type: 'object',
					nullable: true
				}),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': {
					description: 'The current password is incorrect.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/auth/logout': {
		post: {
			tags: [TAG],
			summary: 'Log out',
			description:
				'**Customer or Admin.** Clears the refresh cookie and, for customers, increments the session counter so every issued token becomes invalid.',
			operationId: 'logout',
			security: bearerAuth,
			responses: {
				'200': successResponse('Logged out successfully!', { type: 'object', nullable: true }),
				'401': responseRef('Unauthorized'),
				'500': responseRef('ServerError')
			}
		}
	}
};
