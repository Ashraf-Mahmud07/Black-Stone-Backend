/**
 * Creates a URL friendly slug. Kept dependency free on purpose.
 */
export const slugify = (value: string): string =>
	value
		.toString()
		.trim()
		.toLowerCase()
		.replace(/['"]/g, '')
		.replace(/[^a-z0-9\u0980-\u09ff]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-{2,}/g, '-');

/**
 * Appends a short random suffix so slugs stay unique without a database round trip loop.
 */
export const uniqueSuffix = (length = 5): string =>
	Math.random()
		.toString(36)
		.slice(2, 2 + length);
