export type TAppErrorOptions = {
	/** Field the error belongs to, so the client can attach it to an input. */
	path?: string;
	/** Stable machine readable key the client maps to its own copy (e.g. a Bangla string). */
	code?: string;
	stack?: string;
};

class AppError extends Error {
	public statusCode: number;
	public path: string;
	public code?: string;

	constructor(statusCode: number, message: string, options: TAppErrorOptions | string = {}) {
		super(message);
		// the third argument used to be a stack string - keep that call signature working
		const resolved: TAppErrorOptions = typeof options === 'string' ? { stack: options } : options;

		this.statusCode = statusCode;
		this.path = resolved.path ?? '';
		this.code = resolved.code;

		if (resolved.stack) {
			this.stack = resolved.stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export default AppError;
