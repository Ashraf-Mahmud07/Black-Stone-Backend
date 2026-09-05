import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Categories';

export const categoryPaths: TPathsObject = {
	'/api/categories': {
		get: {
			tags: [TAG],
			summary: 'List categories',
			description:
				'**Public.** Returns active categories sorted by `sortOrder`. When called with an admin token, inactive categories are included and can be filtered with `isActive`.',
			operationId: 'getCategories',
			security: [], // public endpoint
			parameters: [
				parameterRef('Page'),
				parameterRef('Limit'),
				parameterRef('SortBy'),
				parameterRef('SortOrder'),
				{
					name: 'search',
					in: 'query',
					description: 'Matches name, slug or description.',
					required: false,
					schema: { type: 'string' },
					example: 'hijab'
				},
				{
					name: 'isActive',
					in: 'query',
					description: 'Admin only. Ignored for public requests, which always receive active categories.',
					required: false,
					schema: { type: 'string', enum: ['true', 'false'] }
				}
			],
			responses: {
				'200': listResponse('Categories retrieved successfully!', ref('Category')),
				'500': responseRef('ServerError')
			}
		},
		post: {
			tags: [TAG],
			summary: 'Create a category',
			description: '**Admin.** The slug is generated from the name when omitted and is always unique.',
			operationId: 'createCategory',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('CreateCategoryRequest'),
						example: {
							name: 'Three-Piece',
							description: 'Ready to wear three piece sets.',
							sortOrder: 3,
							isActive: true
						}
					}
				}
			},
			responses: {
				'201': successResponse('Category created successfully!', ref('Category')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'500': responseRef('ServerError')
			}
		}
	},

	// GET uses the slug, PATCH/DELETE use the id. They share one path template because
	// OpenAPI does not allow two templated paths at the same position.
	'/api/categories/{slugOrId}': {
		get: {
			tags: [TAG],
			summary: 'Get a category by slug',
			description: '**Public.** Inactive categories return 404 unless the request carries an admin token.',
			operationId: 'getCategoryBySlug',
			security: [],
			parameters: [
				{
					name: 'slugOrId',
					in: 'path',
					description: 'Category **slug**.',
					required: true,
					schema: { type: 'string', example: 'hijab' }
				}
			],
			responses: {
				'200': successResponse('Category retrieved successfully!', ref('Category')),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		patch: {
			tags: [TAG],
			summary: 'Update a category',
			description: '**Admin.** Renaming a category regenerates its slug.',
			operationId: 'updateCategory',
			security: bearerAuth,
			parameters: [parameterRef('SlugOrIdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateCategoryRequest'),
						example: { description: 'Premium hijabs for every occasion.', sortOrder: 1 }
					}
				}
			},
			responses: {
				'200': successResponse('Category updated successfully!', ref('Category')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Deactivate a category',
			description:
				'**Admin.** Categories are never hard deleted; this sets `isActive` to false so existing products and orders stay valid.',
			operationId: 'deactivateCategory',
			security: bearerAuth,
			parameters: [parameterRef('SlugOrIdParam')],
			responses: {
				'200': successResponse('Category deactivated successfully!', ref('Category')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	}
};
