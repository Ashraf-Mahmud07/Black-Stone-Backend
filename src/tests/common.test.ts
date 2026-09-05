import { describe, expect, it } from 'vitest';
import { buildMeta, calculatePagination } from '../app/utils/pagination';
import { slugify } from '../app/utils/slugify';

describe('calculatePagination', () => {
	it('applies sensible defaults', () => {
		const pagination = calculatePagination({});
		expect(pagination).toMatchObject({ page: 1, limit: 10, skip: 0, sortBy: 'createdAt', sortOrder: 'desc' });
	});

	it('parses valid values and computes skip', () => {
		expect(calculatePagination({ page: '3', limit: '20' })).toMatchObject({ page: 3, limit: 20, skip: 40 });
	});

	it('ignores invalid values and clamps the limit', () => {
		expect(calculatePagination({ page: '-2', limit: 'abc' })).toMatchObject({ page: 1, limit: 10 });
		expect(calculatePagination({ limit: '5000' }).limit).toBe(100);
	});

	it('builds pagination meta', () => {
		expect(buildMeta(calculatePagination({ limit: '10' }), 25)).toEqual({
			page: 1,
			limit: 10,
			total: 25,
			totalPage: 3
		});
	});
});

describe('slugify', () => {
	it('creates url friendly slugs', () => {
		expect(slugify('Premium Jersey Hijab')).toBe('premium-jersey-hijab');
		expect(slugify('  Three-Piece  ')).toBe('three-piece');
		expect(slugify("Women's Orna & Scarf")).toBe('womens-orna-scarf');
	});
});
