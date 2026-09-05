import { NextFunction, Request, Response } from 'express';

const FORBIDDEN_KEY = /^\$|\./;

/**
 * Strips operator-like keys ($gt, $where, dotted paths) from user supplied payloads so a
 * crafted body/query can never be interpreted as a query operator by the persistence layer.
 */
const sanitize = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(sanitize);
	if (value && typeof value === 'object' && !(value instanceof Date)) {
		const record = value as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			if (FORBIDDEN_KEY.test(key)) {
				delete record[key];
				continue;
			}
			record[key] = sanitize(record[key]);
		}
		return record;
	}
	return value;
};

const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
	if (req.body) sanitize(req.body);
	if (req.params) sanitize(req.params);
	if (req.query) sanitize(req.query);
	next();
};

export default sanitizeRequest;
