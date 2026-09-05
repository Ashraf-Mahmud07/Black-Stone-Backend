import config from '../config';
import { parameters, responses, securitySchemes } from './components/common';
import { requestSchemas } from './components/requests';
import { schemas } from './components/schemas';
import { authPaths } from './paths/auth.docs';
import { cartPaths } from './paths/cart.docs';
import { categoryPaths } from './paths/category.docs';
import { adminPaths, deliveryPaths, healthPaths, systemPaths } from './paths/misc.docs';
import { orderPaths } from './paths/order.docs';
import { paymentPaths } from './paths/payment.docs';
import { productPaths } from './paths/product.docs';
import { reviewPaths } from './paths/review.docs';
import { userPaths } from './paths/user.docs';
import { TOpenApiDocument, TPathsObject, TTagObject } from './types';

const tags: TTagObject[] = [
	{ name: 'Auth', description: 'Registration, login, token refresh and session management.' },
	{ name: 'Users', description: 'Customer profiles and admin customer management.' },
	{ name: 'Categories', description: 'Product categories (Hijab, Orna, Three-Piece).' },
	{ name: 'Products', description: 'Catalog browsing plus admin product, variant, stock and image management.' },
	{ name: 'Cart', description: 'Server side cart for logged-in customers.' },
	{ name: 'Checkout', description: 'Totals preview and order placement for guests and customers.' },
	{ name: 'Orders', description: 'Order retrieval, tracking, cancellation and admin status updates.' },
	{ name: 'Payments', description: 'bKash / Nagad manual verification, cash on delivery and refunds.' },
	{ name: 'Reviews', description: 'Customer reviews and admin moderation.' },
	{ name: 'Delivery', description: 'Configurable delivery areas, charges and free delivery threshold.' },
	{ name: 'Admin', description: 'Dashboard statistics and admin-only operations.' },
	{ name: 'System', description: 'Health check and internal utility endpoints.' }
];

const paths: TPathsObject = {
	...healthPaths,
	...authPaths,
	...userPaths,
	...categoryPaths,
	...productPaths,
	...cartPaths,
	...orderPaths,
	...paymentPaths,
	...reviewPaths,
	...deliveryPaths,
	...adminPaths,
	...systemPaths
};

/**
 * Every `/api` route passes through the global rate limiter, so 429 is a possible
 * response everywhere. Added centrally instead of repeating it in each operation.
 */
const withRateLimitResponse = (source: TPathsObject): TPathsObject => {
	for (const [path, pathItem] of Object.entries(source)) {
		if (!path.startsWith('/api')) continue;
		for (const operation of Object.values(pathItem)) {
			if (!operation.responses['429']) {
				operation.responses['429'] = { $ref: '#/components/responses/TooManyRequests' };
			}
		}
	}
	return source;
};

const buildServers = (): TOpenApiDocument['servers'] => {
	const servers = [{ url: config.swagger.server_url, description: 'Current environment' }];
	if (config.swagger.staging_url) servers.push({ url: config.swagger.staging_url, description: 'Staging' });
	if (config.swagger.production_url) servers.push({ url: config.swagger.production_url, description: 'Production' });
	return servers;
};

const description = [
	'REST API for the Black Stone women fashion store (Hijab, Orna, Three-Piece).',
	'',
	'### Response format',
	'Every endpoint answers with the same envelope: `{ success, message, data }`, plus `meta` on paginated lists.',
	'Errors use `{ success, message, errorSources }`.',
	'',
	'### Authentication',
	'Log in with `POST /api/auth/login` (customer) or `POST /api/auth/admin/login` (admin), then press **Authorize**',
	'and paste the `accessToken`. Endpoints are labelled **Public**, **Customer** or **Admin** in their description.',
	'',
	'### Business rules worth knowing',
	'- Prices, discounts, delivery charges and totals are always recalculated server side; amounts sent by the client are ignored.',
	'- Stock is validated and reserved atomically, so concurrent orders cannot oversell. Cancelling an order restores stock.',
	'- Orders store product and variant snapshots, so historical orders stay correct when the catalog changes.',
	'- Order status and payment status are separate state machines. Submitting a transaction ID never means a payment is verified.',
	'- Cash on delivery orders require no transaction ID or screenshot; their payment is settled when the order is delivered.',
	'- Only approved reviews are publicly visible.'
].join('\n');

export const openApiDocument: TOpenApiDocument = {
	openapi: '3.0.3',
	info: {
		title: 'Black Stone E-commerce API',
		version: '1.0.0',
		description,
		license: { name: 'ISC', url: 'https://opensource.org/license/isc-license-txt' }
	},
	servers: buildServers(),
	tags,
	paths: withRateLimitResponse(paths),
	components: {
		securitySchemes,
		schemas: { ...schemas, ...requestSchemas },
		parameters,
		responses
	}
};

/** Number of documented operations - used by the docs route audit test. */
export const countOperations = (document: TOpenApiDocument = openApiDocument): number =>
	Object.values(document.paths).reduce((total, pathItem) => total + Object.keys(pathItem).length, 0);

export default openApiDocument;
