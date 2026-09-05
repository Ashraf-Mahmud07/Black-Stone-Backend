import { FilterQuery } from 'mongoose';
import { buildSort, escapeRegex, isValidId } from '../../DB/dbHelpers';
import { TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import { TCategory, TCategoryFilters, TCreateCategoryPayload, TUpdateCategoryPayload } from './category.interfaces';
import { Category, TCategoryDocument } from './category.model';

const toCategory = (doc: TCategoryDocument & { _id?: unknown }): TCategory => ({
	id: String(doc._id),
	name: doc.name,
	slug: doc.slug,
	description: doc.description,
	image: doc.image,
	sortOrder: doc.sortOrder ?? 0,
	isActive: doc.isActive ?? true,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const buildQuery = (filters: TCategoryFilters): FilterQuery<TCategoryDocument> => {
	const query: FilterQuery<TCategoryDocument> = {};
	if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive;
	if (filters.search) {
		const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = [{ name: regex }, { slug: regex }, { description: regex }];
	}
	return query;
};

const create = async (payload: TCreateCategoryPayload & { slug: string }): Promise<TCategory> => {
	const created = await Category.create(payload);
	return toCategory(created.toObject());
};

const findById = async (id: string): Promise<TCategory | null> => {
	if (!isValidId(id)) return null;
	const found = await Category.findById(id).lean();
	return found ? toCategory(found) : null;
};

const findBySlug = async (slug: string): Promise<TCategory | null> => {
	const found = await Category.findOne({ slug: slug.toLowerCase() }).lean();
	return found ? toCategory(found) : null;
};

const findMany = async (
	filters: TCategoryFilters,
	pagination: TPaginationOptions
): Promise<TPaginatedResult<TCategory>> => {
	const query = buildQuery(filters);
	const [rows, total] = await Promise.all([
		Category.find(query)
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Category.countDocuments(query)
	]);
	return { data: rows.map(toCategory), meta: buildMeta(pagination, total) };
};

const update = async (id: string, payload: TUpdateCategoryPayload): Promise<TCategory | null> => {
	if (!isValidId(id)) return null;
	const updated = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
	return updated ? toCategory(updated) : null;
};

/** Categories are never hard deleted - products keep referencing them. */
const deactivate = async (id: string): Promise<TCategory | null> => update(id, { isActive: false });

const count = async (filters: TCategoryFilters = {}): Promise<number> => Category.countDocuments(buildQuery(filters));

const CategoryRepository = {
	create,
	findById,
	findBySlug,
	findMany,
	update,
	deactivate,
	count
};

export default CategoryRepository;
