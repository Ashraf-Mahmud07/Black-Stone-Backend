import { TParameterObject, TResponseObject, TSchemaObject, TSecuritySchemeObject, ref } from '../types';

const errorContent = (message: string, path = ''): TResponseObject['content'] => ({
	'application/json': {
		schema: ref('ErrorResponse'),
		example: { success: false, message, errorSources: [{ path, message }] }
	}
});

/** Error responses shared by every module. */
export const responses: Record<string, TResponseObject> = {
	BadRequest: {
		description: 'Validation failed or the request is not valid for the current state of the resource.',
		content: {
			'application/json': {
				schema: ref('ErrorResponse'),
				example: {
					success: false,
					message: 'Validation Error',
					errorSources: [{ path: 'quantity', message: 'Quantity must be greater than 0!' }]
				}
			}
		}
	},
	Unauthorized: {
		description: 'Missing, expired or invalidated access token.',
		content: errorContent('Invalid or expired token!')
	},
	Forbidden: {
		description: 'Authenticated, but not allowed to perform this action.',
		content: errorContent('Access denied!')
	},
	NotFound: {
		description: 'Resource not found.',
		content: errorContent('Product not found!')
	},
	Conflict: {
		description: 'Conflicting state - duplicate value or insufficient stock.',
		content: errorContent('Only 2 item(s) left in stock for "Premium Jersey Hijab".')
	},
	TooManyRequests: {
		description: 'Rate limit exceeded.',
		content: errorContent('Too many requests! Please try again later.')
	},
	ServerError: {
		description: 'Unexpected server error. Stack traces are only included in development.',
		content: errorContent('Something went wrong')
	}
};

const query = (name: string, description: string, schema: TSchemaObject, example?: unknown): TParameterObject => ({
	name,
	in: 'query',
	description,
	required: false,
	schema,
	...(example !== undefined ? { example } : {})
});

const path = (name: string, description: string, schema: TSchemaObject): TParameterObject => ({
	name,
	in: 'path',
	description,
	required: true,
	schema
});

const objectIdSchema: TSchemaObject = {
	type: 'string',
	pattern: '^[a-f\\d]{24}$',
	example: '6650f1a2b3c4d5e6f7a8b9c0'
};

/** Reusable query and path parameters. */
export const parameters: Record<string, TParameterObject> = {
	Page: query('page', 'Page number (1 based).', { type: 'integer', minimum: 1, default: 1 }, 1),
	Limit: query('limit', 'Items per page. Values above 100 are clamped to 100.', {
		type: 'integer',
		minimum: 1,
		maximum: 100,
		default: 10
	}),
	SortBy: query('sortBy', 'Field to sort by.', { type: 'string', default: 'createdAt' }),
	SortOrder: query('sortOrder', 'Sort direction.', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),

	IdParam: path('id', 'Resource id.', objectIdSchema),
	/**
	 * Used where a public "get by slug" endpoint and an admin "by id" endpoint share the same
	 * position in the URL - OpenAPI allows only one templated name per path segment.
	 */
	SlugOrIdParam: path('slugOrId', 'Resource **id**.', objectIdSchema),
	ProductIdParam: path('productId', 'Product id.', objectIdSchema),
	OrderIdParam: path('orderId', 'Order id.', objectIdSchema),
	VariantIdParam: path('variantId', 'Variant id.', objectIdSchema)
};

export const securitySchemes: Record<string, TSecuritySchemeObject> = {
	bearerAuth: {
		type: 'http',
		scheme: 'bearer',
		bearerFormat: 'JWT',
		description:
			'JWT access token from `POST /api/auth/login` (customer) or `POST /api/auth/admin/login` (admin). Send it as `Authorization: Bearer <token>`. Tokens are invalidated by logout and password change.'
	}
};
