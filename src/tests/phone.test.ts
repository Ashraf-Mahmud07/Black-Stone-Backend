import { describe, expect, it } from 'vitest';
import { isValidBdPhone, normalizeBdPhone } from '../app/utils/phone';

describe('normalizeBdPhone', () => {
	it('keeps an already canonical number', () => {
		expect(normalizeBdPhone('01712345678')).toBe('01712345678');
	});

	it('strips the +880 / 880 country code', () => {
		expect(normalizeBdPhone('+8801712345678')).toBe('01712345678');
		expect(normalizeBdPhone('8801712345678')).toBe('01712345678');
	});

	it('strips spaces, dashes and brackets', () => {
		expect(normalizeBdPhone('017 1234 5678')).toBe('01712345678');
		expect(normalizeBdPhone('01712-345678')).toBe('01712345678');
		expect(normalizeBdPhone(' +880 (171) 234-5678 ')).toBe('01712345678');
	});

	it('restores a missing leading zero', () => {
		expect(normalizeBdPhone('1712345678')).toBe('01712345678');
	});

	it('accepts every valid operator prefix', () => {
		for (const prefix of ['013', '014', '015', '016', '017', '018', '019']) {
			expect(normalizeBdPhone(`${prefix}12345678`)).toBe(`${prefix}12345678`);
		}
	});

	it('rejects anything that is not a Bangladeshi mobile number', () => {
		expect(normalizeBdPhone('01212345678')).toBeUndefined(); // invalid operator prefix
		expect(normalizeBdPhone('0171234567')).toBeUndefined(); // too short
		expect(normalizeBdPhone('017123456789')).toBeUndefined(); // too long
		expect(normalizeBdPhone('+919812345678')).toBeUndefined(); // not Bangladesh
		expect(normalizeBdPhone('not a phone')).toBeUndefined();
		expect(normalizeBdPhone('')).toBeUndefined();
		expect(normalizeBdPhone(undefined)).toBeUndefined();
		expect(normalizeBdPhone(1712345678)).toBeUndefined();
	});

	it('exposes a boolean helper', () => {
		expect(isValidBdPhone('+8801712345678')).toBe(true);
		expect(isValidBdPhone('12345')).toBe(false);
	});
});
