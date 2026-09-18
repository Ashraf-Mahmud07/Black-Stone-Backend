import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
import catchAsync from '../utils/catchAsync';

const validateRequest = (schema: AnyZodObject) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const parsed = await schema.parseAsync({
			body: req.body,
			params: req.params,
			query: req.query,
			cookies: req.cookies
		});

		// Apply the parsed body so schema transforms (phone normalisation, delivery area
		// canonicalisation, defaults) actually reach the controller. Only the body is written
		// back: `req.query` is a getter in Express 5 and assigning to it throws.
		const body = (parsed as { body?: unknown }).body;
		if (body !== undefined) req.body = body;

		next();
	});
};

export default validateRequest;
