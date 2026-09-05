import { describe, expect, it } from 'vitest';
import app from '../app';
import { countOperations, openApiDocument } from '../app/docs/openapi';
import { API_PREFIX, moduleRoutes } from '../app/routes';

type TRegisteredRoute = { method: string; path: string };

type TLayer = {
	route?: { path: string | string[]; methods: Record<string, boolean> };
	handle?: { stack?: TLayer[] };
};

type TRouterLike = { stack: TLayer[] };

/**
 * Walks a real Express router stack and returns every route it registers.
 * Express 5 no longer exposes the mount regexp of a router layer, so the prefixes come from
 * the routing table the application itself uses (API_PREFIX + moduleRoutes).
 */
const collectRoutes = (stack: TLayer[], prefix = ''): TRegisteredRoute[] => {
	const routes: TRegisteredRoute[] = [];

	for (const layer of stack) {
		if (layer.route) {
			const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
			for (const routePath of paths) {
				for (const [method, enabled] of Object.entries(layer.route.methods)) {
					if (!enabled || method === '_all') continue;
					const full = `${prefix}${routePath}`.replace(/\/$/, '') || '/';
					routes.push({ method: method.toUpperCase(), path: full });
				}
			}
			continue;
		}

		// nested routers keep the same prefix (none are used today, handled defensively)
		if (layer.handle?.stack) routes.push(...collectRoutes(layer.handle.stack, prefix));
	}

	return routes;
};

/** `/api/products/:id` -> `/api/products/{id}` */
const toOpenApiPath = (path: string): string => path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

/**
 * Compares paths by shape, ignoring the parameter name.
 * Needed because OpenAPI forbids two templated paths at the same position, so
 * `GET /products/:slug` and `PATCH /products/:id` share the `{slugOrId}` template.
 */
const normalize = (path: string): string => toOpenApiPath(path).replace(/{[^}]+}/g, '{}');

const appStack = (app as unknown as { router?: TRouterLike; _router?: TRouterLike }).router?.stack ?? [];

const registeredRoutes: TRegisteredRoute[] = [
	// routes registered directly on the app (health check)
	...collectRoutes(appStack.filter((layer) => Boolean(layer.route))),
	// every module router, mounted the same way the application mounts them
	...moduleRoutes.flatMap((moduleRoute) =>
		collectRoutes((moduleRoute.route as unknown as TRouterLike).stack, `${API_PREFIX}${moduleRoute.path}`)
	)
].filter((route) => !route.path.startsWith('/api-docs'));

describe('OpenAPI document', () => {
	it('is a valid OpenAPI 3 document with servers, tags and security', () => {
		expect(openApiDocument.openapi).toMatch(/^3\./);
		expect(openApiDocument.info.title).toBeTruthy();
		expect(openApiDocument.servers.length).toBeGreaterThan(0);
		expect(openApiDocument.tags.length).toBeGreaterThan(0);
		expect(openApiDocument.components.securitySchemes.bearerAuth).toBeDefined();
	});

	it('resolves every $ref used in the document', () => {
		const serialized = JSON.stringify(openApiDocument);
		const refs = [...serialized.matchAll(/"\$ref":"#\/components\/(\w+)\/([^"]+)"/g)];
		expect(refs.length).toBeGreaterThan(0);

		const components = openApiDocument.components as unknown as Record<string, Record<string, unknown>>;
		const missing = refs
			.filter(([, section, name]) => components[section]?.[name] === undefined)
			.map(([, section, name]) => `${section}/${name}`);

		expect(missing).toEqual([]);
	});

	it('gives every operation a tag, a summary, a unique operationId and responses', () => {
		const operationIds: string[] = [];

		for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
			for (const [method, operation] of Object.entries(pathItem)) {
				const label = `${method.toUpperCase()} ${path}`;
				expect(operation.tags.length, label).toBeGreaterThan(0);
				expect(operation.summary, label).toBeTruthy();
				expect(operation.description, label).toBeTruthy();
				expect(Object.keys(operation.responses).length, label).toBeGreaterThan(0);
				operationIds.push(operation.operationId);
			}
		}

		expect(new Set(operationIds).size).toBe(operationIds.length);
	});

	it('declares every path parameter it uses as a required path parameter', () => {
		const resolve = (parameter: { $ref?: string; name?: string; in?: string; required?: boolean }) =>
			parameter.$ref
				? openApiDocument.components.parameters[parameter.$ref.split('/').pop() as string]
				: (parameter as { name: string; in: string; required?: boolean });

		for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
			const expected = [...path.matchAll(/{(\w+)}/g)].map((match) => match[1]);
			if (!expected.length) continue;

			for (const [method, operation] of Object.entries(pathItem)) {
				const label = `${method.toUpperCase()} ${path}`;
				const declared = (operation.parameters ?? []).map(resolve).filter(Boolean);
				const pathParams = declared.filter((parameter) => parameter?.in === 'path');

				expect(pathParams.map((parameter) => parameter?.name).sort(), label).toEqual([...expected].sort());
				expect(
					pathParams.every((parameter) => parameter?.required === true),
					`${label}: path parameters must be required`
				).toBe(true);
			}
		}
	});
});

describe('route audit', () => {
	it('finds the registered Express routes', () => {
		expect(registeredRoutes.length).toBeGreaterThan(50);
	});

	it('documents every registered route', () => {
		const documented = new Set(
			Object.entries(openApiDocument.paths).flatMap(([path, pathItem]) =>
				Object.keys(pathItem).map((method) => `${method.toUpperCase()} ${normalize(path)}`)
			)
		);

		const undocumented = registeredRoutes.filter(({ method, path }) => !documented.has(`${method} ${normalize(path)}`));

		expect(undocumented, `Undocumented routes: ${JSON.stringify(undocumented)}`).toEqual([]);
	});

	it('does not document routes that do not exist', () => {
		const registered = new Set(registeredRoutes.map(({ method, path }) => `${method} ${normalize(path)}`));

		const phantom: string[] = [];
		for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
			for (const method of Object.keys(pathItem)) {
				if (!registered.has(`${method.toUpperCase()} ${normalize(path)}`))
					phantom.push(`${method.toUpperCase()} ${path}`);
			}
		}

		expect(phantom, `Documented but not registered: ${JSON.stringify(phantom)}`).toEqual([]);
	});

	it('documents the same number of operations as the app registers', () => {
		expect(countOperations()).toBe(registeredRoutes.length);
	});
});

describe('security documentation', () => {
	const publicOperations = [
		'GET /',
		'POST /api/auth/register',
		'POST /api/auth/login',
		'POST /api/auth/admin/login',
		'POST /api/auth/refresh-token',
		'POST /api/admin/login',
		'GET /api/categories',
		'GET /api/categories/{slugOrId}',
		'GET /api/products',
		'GET /api/products/id/{id}',
		'GET /api/products/{slugOrId}',
		'POST /api/orders/checkout/preview',
		'POST /api/orders/checkout',
		'POST /api/orders/track',
		'GET /api/payments/orders/{orderId}',
		'POST /api/payments/orders/{orderId}/submit',
		'GET /api/reviews/product/{productId}',
		'GET /api/delivery/settings',
		'POST /api/system/mail-to-company'
	];

	it('marks protected operations with bearerAuth and leaves public ones open', () => {
		for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
			for (const [method, operation] of Object.entries(pathItem)) {
				const key = `${method.toUpperCase()} ${path}`;
				const hasSecurity = Boolean(operation.security?.length);
				expect(hasSecurity, key).toBe(!publicOperations.includes(key));
			}
		}
	});

	it('documents 401 and 403 for protected operations', () => {
		for (const [path, pathItem] of Object.entries(openApiDocument.paths)) {
			for (const [method, operation] of Object.entries(pathItem)) {
				if (!operation.security?.length) continue;
				expect(Object.keys(operation.responses), `${method.toUpperCase()} ${path}`).toContain('401');
			}
		}
	});

	it('documents file uploads as multipart/form-data', () => {
		const uploadOperations = [
			openApiDocument.paths['/api/products/{id}/images']?.post,
			openApiDocument.paths['/api/payments/orders/{orderId}/submit']?.post
		];

		for (const operation of uploadOperations) {
			expect(Object.keys(operation?.requestBody?.content ?? {})).toEqual(['multipart/form-data']);
		}
	});
});
