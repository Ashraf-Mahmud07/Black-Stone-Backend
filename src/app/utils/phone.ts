/**
 * Bangladeshi mobile numbers arrive in many shapes: `+8801712345678`, `8801712345678`,
 * `01712-345678`, `017 1234 5678`. One canonical form - `01XXXXXXXXX` - is stored, so
 * lookups (guest order tracking, duplicate detection) match regardless of how it was typed.
 */

const BD_MOBILE = /^01[3-9]\d{8}$/;

/**
 * Returns the canonical `01XXXXXXXXX` form, or undefined when the input is not a valid
 * Bangladeshi mobile number.
 */
export const normalizeBdPhone = (value: unknown): string | undefined => {
	if (typeof value !== 'string') return undefined;

	// strip everything a human might type as separators
	let digits = value.replace(/[\s()+-]/g, '');
	if (!digits) return undefined;

	// +880 / 880 country code -> local form
	if (digits.startsWith('880')) digits = digits.slice(3);
	// a bare 10 digit number missing its leading zero (1712345678)
	if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`;

	return BD_MOBILE.test(digits) ? digits : undefined;
};

/** True when the value is (or can be normalised into) a valid Bangladeshi mobile number. */
export const isValidBdPhone = (value: unknown): boolean => normalizeBdPhone(value) !== undefined;
