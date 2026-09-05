/**
 * Minimal OpenAPI 3.0 typings.
 *
 * The specification is authored as plain TypeScript objects (instead of JSDoc comments) so the
 * whole document is type checked at build time and behaves identically in `src` and `dist` -
 * there is no runtime file globbing that could silently produce an empty spec in production.
 */

export type TSchemaObject = {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';
	format?: string;
	description?: string;
	example?: unknown;
	enum?: readonly (string | number)[];
	default?: unknown;
	nullable?: boolean;
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	minItems?: number;
	maxItems?: number;
	pattern?: string;
	items?: TSchemaObject;
	properties?: Record<string, TSchemaObject>;
	additionalProperties?: boolean | TSchemaObject;
	required?: string[];
	allOf?: TSchemaObject[];
	oneOf?: TSchemaObject[];
	anyOf?: TSchemaObject[];
	$ref?: string;
	readOnly?: boolean;
	writeOnly?: boolean;
};

export type TParameterObject = {
	name: string;
	in: 'query' | 'path' | 'header' | 'cookie';
	description?: string;
	required?: boolean;
	schema: TSchemaObject;
	example?: unknown;
	$ref?: string;
};

export type TParameterRef = { $ref: string };

export type TMediaTypeObject = {
	schema: TSchemaObject;
	example?: unknown;
	examples?: Record<string, { summary?: string; value: unknown }>;
	encoding?: Record<string, { contentType?: string }>;
};

export type TRequestBodyObject = {
	description?: string;
	required?: boolean;
	content: Record<string, TMediaTypeObject>;
};

export type TResponseObject = {
	description: string;
	content?: Record<string, TMediaTypeObject>;
};

export type TResponseRef = { $ref: string };

export type TSecurityRequirement = Record<string, string[]>;

export type TSecuritySchemeObject = {
	type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
	scheme?: string;
	bearerFormat?: string;
	name?: string;
	in?: 'query' | 'header' | 'cookie';
	description?: string;
};

export type TOperationObject = {
	tags: string[];
	summary: string;
	description?: string;
	operationId: string;
	security?: TSecurityRequirement[];
	parameters?: (TParameterObject | TParameterRef)[];
	requestBody?: TRequestBodyObject;
	responses: Record<string, TResponseObject | TResponseRef>;
	deprecated?: boolean;
};

export type TPathItemObject = Partial<Record<'get' | 'post' | 'put' | 'patch' | 'delete', TOperationObject>>;

export type TPathsObject = Record<string, TPathItemObject>;

export type TTagObject = {
	name: string;
	description: string;
};

export type TOpenApiDocument = {
	openapi: string;
	info: {
		title: string;
		version: string;
		description: string;
		contact?: { name?: string; email?: string };
		license?: { name: string; url?: string };
	};
	servers: { url: string; description: string }[];
	tags: TTagObject[];
	paths: TPathsObject;
	components: {
		securitySchemes: Record<string, TSecuritySchemeObject>;
		schemas: Record<string, TSchemaObject>;
		parameters: Record<string, TParameterObject>;
		responses: Record<string, TResponseObject>;
	};
};

// ---------------------------------------------------------------------------
// small helpers used across the path documents
// ---------------------------------------------------------------------------

export const ref = (schema: string): TSchemaObject => ({ $ref: `#/components/schemas/${schema}` });

export const responseRef = (name: string): TResponseRef => ({ $ref: `#/components/responses/${name}` });

export const parameterRef = (name: string): TParameterRef => ({ $ref: `#/components/parameters/${name}` });

/** Wraps a payload schema in the project's standard success envelope. */
export const successResponse = (
	description: string,
	dataSchema: TSchemaObject,
	options: { paginated?: boolean; example?: unknown; message?: string } = {}
): TResponseObject => ({
	description,
	content: {
		'application/json': {
			schema: {
				type: 'object',
				properties: {
					success: { type: 'boolean', example: true },
					message: { type: 'string', example: options.message ?? description },
					...(options.paginated ? { meta: ref('PaginationMeta') } : {}),
					data: dataSchema
				},
				required: ['success', 'message', 'data']
			},
			...(options.example !== undefined ? { example: options.example } : {})
		}
	}
});

/** Success envelope wrapping an array of items (used together with `meta`). */
export const listResponse = (description: string, itemSchema: TSchemaObject): TResponseObject =>
	successResponse(description, { type: 'array', items: itemSchema }, { paginated: true });

export const bearerAuth: TSecurityRequirement[] = [{ bearerAuth: [] }];
