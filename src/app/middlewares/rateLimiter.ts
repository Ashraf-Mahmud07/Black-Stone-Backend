import rateLimit from 'express-rate-limit';
import config from '../config';

const isProduction = config.NODE_ENV === 'production';

const message = {
	success: false,
	message: 'Too many requests! Please try again later.',
	errorSources: [{ path: '', message: 'Too many requests! Please try again later.' }]
};

/** Applied to every /api route. */
export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: isProduction ? 300 : 10000,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message
});

/** Stricter limit for credential and payment submission endpoints. */
export const strictLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: isProduction ? 20 : 1000,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message
});
