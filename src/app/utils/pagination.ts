import { TPaginationOptions } from '../interface/common';

type TRawPaginationQuery = {
	page?: unknown;
	limit?: unknown;
	sortBy?: unknown;
	sortOrder?: unknown;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Normalises raw query params into safe pagination options.
 * Storage agnostic - repositories translate `skip`/`sortBy` into their own dialect.
 */
export const calculatePagination = (
	query: TRawPaginationQuery,
	defaults: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
): TPaginationOptions => {
	const parsedPage = Number(query.page);
	const parsedLimit = Number(query.limit);

	const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : DEFAULT_PAGE;
	const limit =
		Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), MAX_LIMIT) : DEFAULT_LIMIT;

	const sortBy = typeof query.sortBy === 'string' && query.sortBy ? query.sortBy : (defaults.sortBy ?? 'createdAt');
	const sortOrder =
		query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : (defaults.sortOrder ?? 'desc');

	return {
		page,
		limit,
		skip: (page - 1) * limit,
		sortBy,
		sortOrder
	};
};

export const buildMeta = (pagination: TPaginationOptions, total: number) => ({
	page: pagination.page,
	limit: pagination.limit,
	total,
	totalPage: Math.ceil(total / pagination.limit) || 0
});
