import { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import config from '../config';
import { openApiDocument } from './openapi';

/**
 * Optional HTTP basic auth for the documentation endpoints.
 * Enabled by setting both SWAGGER_USER and SWAGGER_PASSWORD (recommended in production).
 */
const protectDocs = (req: Request, res: Response, next: NextFunction): void => {
	const { user, password } = config.swagger;
	if (!user || !password) return next();

	const header = req.headers.authorization ?? '';
	const [scheme, encoded] = header.split(' ');

	if (scheme === 'Basic' && encoded) {
		const [suppliedUser, suppliedPassword] = Buffer.from(encoded, 'base64').toString().split(':');
		if (suppliedUser === user && suppliedPassword === password) return next();
	}

	res.setHeader('WWW-Authenticate', 'Basic realm="API documentation"');
	res.status(401).json({
		success: false,
		message: 'Documentation access requires credentials',
		errorSources: [{ path: '', message: 'Documentation access requires credentials' }]
	});
};

const uiOptions: swaggerUi.SwaggerUiOptions = {
	customSiteTitle: 'Black Stone API documentation',
	swaggerOptions: {
		persistAuthorization: true,
		docExpansion: 'none',
		filter: true,
		displayRequestDuration: true,
		tagsSorter: 'alpha',
		defaultModelsExpandDepth: 1
	}
};

/**
 * Mounts Swagger UI and the raw OpenAPI document.
 * The spec is a plain object built at import time, so it behaves identically in `src` and `dist`.
 */
const setupSwagger = (app: Application): void => {
	if (!config.swagger.enabled) return;

	const basePath = config.swagger.path;

	// Swagger UI ships inline scripts and styles, which the strict application wide
	// helmet policy blocks. The relaxed policy applies to the documentation routes only.
	const docsCsp = helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:'],
				connectSrc: ["'self'"]
			}
		}
	});

	app.get(`${basePath}.json`, docsCsp, protectDocs, (req: Request, res: Response) => {
		res.json(openApiDocument);
	});

	app.use(basePath, docsCsp, protectDocs, swaggerUi.serve, swaggerUi.setup(openApiDocument, uiOptions));
};

export default setupSwagger;
