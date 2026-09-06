import { NextFunction, Request, Response } from 'express';
import connectToDatabase from '../DB/connect';
import catchAsync from '../utils/catchAsync';

/**
 * Guarantees a database connection before any route handler runs.
 * On a long running server the connection already exists and this is a no-op; on a
 * serverless instance it establishes (or reuses) the cached connection on the first request.
 */
const ensureDatabase = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	await connectToDatabase();
	next();
});

export default ensureDatabase;
