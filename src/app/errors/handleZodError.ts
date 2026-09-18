import { ZodError, ZodIssue } from 'zod';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

/** Maps a zod issue onto a short, stable rule name used in the error code. */
const ruleFor = (issue: ZodIssue): string => {
	switch (issue.code) {
		case 'invalid_type':
			return issue.received === 'undefined' ? 'required' : 'invalid';
		case 'too_small':
			return issue.type === 'string' && issue.minimum === 1 ? 'required' : 'too_small';
		case 'too_big':
			return 'too_big';
		case 'invalid_string':
		case 'invalid_enum_value':
		case 'unrecognized_keys':
			return 'invalid';
		default:
			return 'invalid';
	}
};

const handleZodError = (err: ZodError): TGenericErrorResponse => {
	const errorSources: TErrorSources = err.issues.map((issue: ZodIssue) => {
		// drop the `body` / `params` / `query` wrapper so the path matches the request payload
		const fieldPath = issue.path.filter(
			(segment, index) =>
				!(index === 0 && typeof segment === 'string' && ['body', 'params', 'query', 'cookies'].includes(segment))
		);
		const dottedPath = fieldPath.join('.');

		return {
			path: fieldPath[fieldPath.length - 1] ?? '',
			message: issue.message,
			code: `validation.${dottedPath || 'request'}.${ruleFor(issue)}`
		};
	});

	const statusCode = 400;
	return {
		statusCode,
		message: 'Validation Error',
		errorSources
	};
};

export default handleZodError;
