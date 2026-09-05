import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import { slugify, uniqueSuffix } from '../../utils/slugify';
import { TCategory, TCategoryFilters, TCreateCategoryPayload, TUpdateCategoryPayload } from './category.interfaces';
import CategoryRepository from './category.repository';

const buildUniqueSlug = async (source: string, currentId?: string): Promise<string> => {
	const base = slugify(source);
	if (!base) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Unable to generate a slug from the given name!');
	}
	const existing = await CategoryRepository.findBySlug(base);
	if (!existing || existing.id === currentId) return base;
	return `${base}-${uniqueSuffix(4)}`;
};

const createCategory = async (payload: TCreateCategoryPayload): Promise<TCategory> => {
	const slug = await buildUniqueSlug(payload.slug || payload.name);
	return CategoryRepository.create({ ...payload, slug });
};

const updateCategory = async (id: string, payload: TUpdateCategoryPayload): Promise<TCategory> => {
	const category = await CategoryRepository.findById(id);
	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}

	const nextPayload: TUpdateCategoryPayload = { ...payload };
	if (payload.slug || (payload.name && payload.name !== category.name)) {
		nextPayload.slug = await buildUniqueSlug(payload.slug || (payload.name as string), id);
	}

	const updated = await CategoryRepository.update(id, nextPayload);
	if (!updated) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}
	return updated;
};

/** Soft delete - keeps historical products and orders consistent. */
const deactivateCategory = async (id: string): Promise<TCategory> => {
	const category = await CategoryRepository.findById(id);
	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}
	const updated = await CategoryRepository.deactivate(id);
	return updated as TCategory;
};

const getCategories = async (
	query: Record<string, unknown>,
	options: { includeInactive?: boolean } = {}
): Promise<TPaginatedResult<TCategory>> => {
	const pagination = calculatePagination(query, { sortBy: 'sortOrder', sortOrder: 'asc' });

	const filters: TCategoryFilters = {
		search: typeof query.search === 'string' ? query.search : undefined,
		isActive: options.includeInactive ? (query.isActive === undefined ? undefined : query.isActive === 'true') : true
	};

	return CategoryRepository.findMany(filters, pagination);
};

const getCategoryBySlug = async (slug: string, options: { includeInactive?: boolean } = {}): Promise<TCategory> => {
	const category = await CategoryRepository.findBySlug(slug);
	if (!category || (!category.isActive && !options.includeInactive)) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}
	return category;
};

const getCategoryById = async (id: string): Promise<TCategory> => {
	const category = await CategoryRepository.findById(id);
	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}
	return category;
};

const CategoryServices = {
	createCategory,
	updateCategory,
	deactivateCategory,
	getCategories,
	getCategoryBySlug,
	getCategoryById
};

export default CategoryServices;
