export type TMeta = {
	limit: number;
	page: number;
	total: number;
	totalPage: number;
};

export type TPaginatedResult<T> = {
	data: T[];
	meta: TMeta;
};

export type TPaginationOptions = {
	page: number;
	limit: number;
	skip: number;
	sortBy: string;
	sortOrder: 'asc' | 'desc';
};

export type TSortOrder = 'asc' | 'desc';

/**
 * Database agnostic identifier used across the whole application.
 * Services and controllers only ever deal with this type - never with ObjectId.
 */
export type TId = string;

/** Generic stored image reference (url + storage key so the file can be removed later). */
export type TImage = {
	url: string;
	key?: string;
	alt?: string;
	isPrimary?: boolean;
};
