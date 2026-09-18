export type TErrorSources = {
	/** Field the error belongs to. Empty string for errors that are not field specific. */
	path: string | number;
	/** Human readable English message. */
	message: string;
	/**
	 * Stable machine readable key the client maps to its own copy (e.g. a Bangla string).
	 * Shaped as `validation.<full.field.path>.<rule>`, e.g. `validation.customer.phone.invalid`.
	 */
	code?: string;
}[];

export type TGenericErrorResponse = {
	statusCode: number;
	message: string;
	errorSources: TErrorSources;
};
