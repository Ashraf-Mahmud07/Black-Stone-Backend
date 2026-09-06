import { Status as UserStatus } from '../../modules/User/user.interfaces';
import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Users';

export const userPaths: TPathsObject = {
	'/api/users/me': {
		patch: {
			tags: [TAG],
			summary: 'Update my profile',
			description:
				'**Customer.** Updates the authenticated customer profile and saved addresses. Email, role, status and password cannot be changed here.',
			operationId: 'updateMyProfile',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateProfileRequest'),
						example: {
							name: 'Ayesha Rahman',
							phone: '01712345678',
							addresses: [
								{
									label: 'Home',
									name: 'Ayesha Rahman',
									phone: '01712345678',
									address: 'House 12, Road 4, Dhanmondi, Dhaka 1209',
									isDefault: true
								}
							]
						}
					}
				}
			},
			responses: {
				'200': successResponse('Profile updated successfully!', ref('User')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/users': {
		get: {
			tags: [TAG],
			summary: 'List customers',
			description: '**Admin.** Paginated customer list. Soft deleted customers and admins are excluded.',
			operationId: 'getUsers',
			security: bearerAuth,
			parameters: [
				parameterRef('Page'),
				parameterRef('Limit'),
				parameterRef('SortBy'),
				parameterRef('SortOrder'),
				{
					name: 'search',
					in: 'query',
					description: 'Matches name, username, email or phone.',
					required: false,
					schema: { type: 'string' },
					example: 'ayesha'
				},
				{
					name: 'status',
					in: 'query',
					description: 'Filter by account status.',
					required: false,
					schema: { type: 'string', enum: Object.values(UserStatus) }
				}
			],
			responses: {
				'200': listResponse('Users retrieved successfully!', ref('User')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/users/{id}': {
		get: {
			tags: [TAG],
			summary: 'Get a customer',
			description: '**Admin or the customer themselves.** Customers may only read their own profile.',
			operationId: 'getUser',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('User retrieved successfully!', ref('User')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Delete a customer',
			description: '**Admin.** Soft delete - the record is kept so historical orders stay intact.',
			operationId: 'deleteUser',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('User deleted successfully!', ref('User')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/users/{id}/status': {
		patch: {
			tags: [TAG],
			summary: 'Block or unblock a customer',
			description: '**Admin.** A blocked customer cannot log in and their existing tokens stop working.',
			operationId: 'changeUserStatus',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('ChangeUserStatusRequest'),
						example: { status: UserStatus.Blocked }
					}
				}
			},
			responses: {
				'200': successResponse('User status updated to blocked successfully!', ref('User')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	}
};
