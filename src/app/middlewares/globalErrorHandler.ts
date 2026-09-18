/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
// import { ErrorRequestHandler } from "express";

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import AppError from '../errors/AppError';
import handleCastError from '../errors/handleCastError';
import handleDuplicateError from '../errors/handleDuplicateError';
import handleValidationError from '../errors/handleValidationError';
import handleZodError from '../errors/handleZodError';
import { TErrorSources } from '../interface/error';

type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => void;

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
	// setting default values
	let statusCode: number = 500;
	let message = 'Something went wrong';
	let errorSources: TErrorSources = [
		{
			path: '',
			message: 'Something went wrong'
		}
	];

	if (err instanceof ZodError) {
		const simplifiedError = handleZodError(err);
		statusCode = simplifiedError.statusCode;
		message = simplifiedError.message;
		errorSources = simplifiedError.errorSources;
	} else if (err?.name === 'ValidationError') {
		const simplifiedError = handleValidationError(err);
		statusCode = simplifiedError.statusCode;
		message = simplifiedError.message;
		errorSources = simplifiedError.errorSources;
	} else if (err?.name === 'CastError') {
		const simplifiedError = handleCastError(err);
		statusCode = simplifiedError.statusCode;
		message = simplifiedError.message;
		errorSources = simplifiedError.errorSources;
	} else if (err?.code === 11000) {
		const simplifiedError = handleDuplicateError(err);
		statusCode = simplifiedError.statusCode;
		message = simplifiedError.message;
		errorSources = simplifiedError.errorSources;
	} else if (err instanceof AppError) {
		statusCode = err?.statusCode;
		message = err?.message;
		errorSources = [
			{
				path: err?.path ?? '',
				message: err?.message,
				...(err?.code ? { code: err.code } : {})
			}
		];
	} else if (err instanceof Error) {
		message = err?.message;
		errorSources = [
			{
				path: '',
				message: err?.message
			}
		];
	}

	// actual return
	res.status(statusCode).json({
		success: false,
		message,
		errorSources,
		...(config.NODE_ENV === 'development' && { stack: err?.stack })
	});
};

export default globalErrorHandler;
