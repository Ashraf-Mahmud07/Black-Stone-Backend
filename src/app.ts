import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import config from './app/config';
import setupSwagger from './app/docs';
import ensureDatabase from './app/middlewares/ensureDatabase';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { apiLimiter } from './app/middlewares/rateLimiter';
import sanitizeRequest from './app/middlewares/sanitizeRequest';
import router, { API_PREFIX } from './app/routes';

const app: Application = express();

// security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use(
	cors({
		origin: config.cors_origins,
		credentials: true
	})
);

// strips mongo operator style keys from any user supplied payload
app.use(sanitizeRequest);

// API documentation: Swagger UI at SWAGGER_PATH (default /api-docs) and the raw
// OpenAPI document at the same path with a .json suffix.
setupSwagger(app);

// serverless instances start without a connection - this establishes (or reuses) it
app.use(API_PREFIX, apiLimiter, ensureDatabase, router);

app.get('/', (req: Request, res: Response) => {
	res.send({
		success: true,
		message: 'The server is running'
	});
});

// global error handler middleware
app.use(globalErrorHandler);

// not found middleware
app.use(notFound);

export default app;
