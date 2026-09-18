import { FilterQuery } from 'mongoose';
import { buildSort, escapeRegex, isValidId } from '../../DB/dbHelpers';
import { TImage, TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import {
	ProductStatus,
	TCreateProductPayload,
	TProduct,
	TProductFilters,
	TProductVariant,
	TStockLine,
	TUpdateProductPayload,
	TVariantPayload
} from './product.interfaces';
import { Product, TProductDocument, TProductVariantDocument } from './product.model';

export type TStockOperationResult = { success: boolean; failedLine?: TStockLine };

/**
 * `fallbackImage` is the product's primary image. It is only used to fill `displayImage`,
 * so the storefront can render a colour swatch without a second request and without
 * implementing the fallback itself.
 */
const toVariant = (doc: TProductVariantDocument, fallbackImage?: TImage): TProductVariant => {
	const images = doc.images ?? [];
	const ownImage = doc.image ?? images[0] ?? undefined;

	return {
		id: String(doc._id),
		sku: doc.sku,
		color: doc.color,
		colorBn: doc.colorBn,
		size: doc.size,
		design: doc.design,
		attributes: doc.attributes instanceof Map ? Object.fromEntries(doc.attributes) : doc.attributes,
		price: doc.price,
		discountPrice: doc.discountPrice,
		stock: doc.stock ?? 0,
		image: doc.image ?? undefined,
		images,
		displayImage: ownImage ?? fallbackImage,
		hasOwnImage: Boolean(ownImage),
		isActive: doc.isActive ?? true
	};
};

const toProduct = (doc: TProductDocument): TProduct => {
	const category = doc.category as { _id?: unknown; name?: string; slug?: string } | undefined;
	const isPopulated = Boolean(category && typeof category === 'object' && 'name' in category);
	const images = doc.images ?? [];
	const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

	return {
		id: String(doc._id),
		name: doc.name,
		slug: doc.slug,
		description: doc.description,
		shortDescription: doc.shortDescription,
		categoryId: isPopulated ? String(category?._id) : String(doc.category),
		category: isPopulated
			? { id: String(category?._id), name: category?.name as string, slug: category?.slug as string }
			: undefined,
		images: doc.images ?? [],
		videos: doc.videos ?? [],
		price: doc.price,
		discountPrice: doc.discountPrice,
		sku: doc.sku,
		variants: (doc.variants ?? []).map((variant) => toVariant(variant, primaryImage)),
		specifications: doc.specifications ?? [],
		stock: doc.stock ?? 0,
		status: doc.status,
		featured: doc.featured ?? false,
		tags: doc.tags ?? [],
		seo: doc.seo,
		ratingAverage: doc.ratingAverage ?? 0,
		ratingCount: doc.ratingCount ?? 0,
		isDeleted: doc.isDeleted ?? false,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt
	};
};

const buildQuery = (filters: TProductFilters): FilterQuery<TProductDocument> => {
	const query: FilterQuery<TProductDocument> = { isDeleted: false };

	if (filters.status) {
		query.status = filters.status;
	} else if (!filters.includeAllStatuses) {
		query.status = ProductStatus.Active;
	}

	if (filters.categoryId && isValidId(filters.categoryId)) query.category = filters.categoryId;
	if (typeof filters.featured === 'boolean') query.featured = filters.featured;
	if (filters.tags?.length) query.tags = { $in: filters.tags };
	if (filters.inStock) query.stock = { $gt: 0 };

	if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
		const priceQuery: Record<string, number> = {};
		if (filters.minPrice !== undefined) priceQuery.$gte = filters.minPrice;
		if (filters.maxPrice !== undefined) priceQuery.$lte = filters.maxPrice;
		query.price = priceQuery;
	}

	if (filters.search) {
		const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = [{ name: regex }, { shortDescription: regex }, { description: regex }, { tags: regex }, { sku: regex }];
	}

	return query;
};

const create = async (
	payload: TCreateProductPayload & { slug: string; sku: string; stock: number }
): Promise<TProduct> => {
	const created = await Product.create({
		...payload,
		category: payload.categoryId
	});
	const populated = await Product.findById(created._id).populate('category', 'name slug').lean();
	return toProduct(populated as TProductDocument);
};

const findById = async (id: string, options: { includeDeleted?: boolean } = {}): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	const query: FilterQuery<TProductDocument> = { _id: id };
	if (!options.includeDeleted) query.isDeleted = false;
	const found = await Product.findOne(query).populate('category', 'name slug').lean();
	return found ? toProduct(found as TProductDocument) : null;
};

const findBySlug = async (slug: string): Promise<TProduct | null> => {
	const found = await Product.findOne({ slug: slug.toLowerCase(), isDeleted: false })
		.populate('category', 'name slug')
		.lean();
	return found ? toProduct(found as TProductDocument) : null;
};

const findBySku = async (sku: string): Promise<TProduct | null> => {
	const found = await Product.findOne({ sku: sku.toUpperCase(), isDeleted: false }).lean();
	return found ? toProduct(found as TProductDocument) : null;
};

const findManyByIds = async (ids: string[]): Promise<TProduct[]> => {
	const validIds = ids.filter(isValidId);
	if (!validIds.length) return [];
	const rows = await Product.find({ _id: { $in: validIds }, isDeleted: false })
		.populate('category', 'name slug')
		.lean();
	return rows.map((row) => toProduct(row as TProductDocument));
};

const findMany = async (
	filters: TProductFilters,
	pagination: TPaginationOptions
): Promise<TPaginatedResult<TProduct>> => {
	const query = buildQuery(filters);
	const [rows, total] = await Promise.all([
		Product.find(query)
			.populate('category', 'name slug')
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		Product.countDocuments(query)
	]);
	return { data: rows.map((row) => toProduct(row as TProductDocument)), meta: buildMeta(pagination, total) };
};

const update = async (id: string, payload: TUpdateProductPayload & { slug?: string }): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { categoryId, variants, ...rest } = payload;
	const updatePayload: Record<string, unknown> = { ...rest };
	if (categoryId) updatePayload.category = categoryId;

	const updated = await Product.findOneAndUpdate({ _id: id, isDeleted: false }, updatePayload, {
		new: true,
		runValidators: true
	})
		.populate('category', 'name slug')
		.lean();
	return updated ? toProduct(updated as TProductDocument) : null;
};

const setStatus = async (id: string, status: ProductStatus): Promise<TProduct | null> => update(id, { status });

/** Products are never hard deleted so historical orders stay intact. */
const softDelete = async (id: string): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	const deleted = await Product.findOneAndUpdate(
		{ _id: id, isDeleted: false },
		{ isDeleted: true, status: ProductStatus.Inactive },
		{ new: true }
	).lean();
	return deleted ? toProduct(deleted as TProductDocument) : null;
};

// ---------------------------------------------------------------------------
// variants
// ---------------------------------------------------------------------------

const syncTotalStock = async (id: string): Promise<void> => {
	const product = await Product.findById(id).select('variants stock').lean();
	if (!product) return;
	if (!product.variants?.length) return;
	const total = product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
	await Product.updateOne({ _id: id }, { stock: total });
};

const addVariant = async (id: string, variant: TVariantPayload): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $push: { variants: variant } });
	await syncTotalStock(id);
	return findById(id);
};

const updateVariant = async (
	id: string,
	variantId: string,
	payload: Partial<TVariantPayload>
): Promise<TProduct | null> => {
	if (!isValidId(id) || !isValidId(variantId)) return null;
	const setPayload = Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
		if (value !== undefined) acc[`variants.$.${key}`] = value;
		return acc;
	}, {});
	if (Object.keys(setPayload).length) {
		await Product.updateOne({ _id: id, isDeleted: false, 'variants._id': variantId }, { $set: setPayload });
		await syncTotalStock(id);
	}
	return findById(id);
};

/** Replaces a variant's media. `image` is unset (not nulled) when the variant has none left. */
const setVariantMedia = async (
	id: string,
	variantId: string,
	media: { image?: TImage; images: TImage[] }
): Promise<TProduct | null> => {
	if (!isValidId(id) || !isValidId(variantId)) return null;

	const update = media.image
		? { $set: { 'variants.$.image': media.image, 'variants.$.images': media.images } }
		: { $set: { 'variants.$.images': media.images }, $unset: { 'variants.$.image': '' } };

	await Product.updateOne({ _id: id, isDeleted: false, 'variants._id': variantId }, update);
	return findById(id);
};

const removeVariant = async (id: string, variantId: string): Promise<TProduct | null> => {
	if (!isValidId(id) || !isValidId(variantId)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $pull: { variants: { _id: variantId } } });
	await syncTotalStock(id);
	return findById(id);
};

const replaceVariants = async (id: string, variants: TVariantPayload[]): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	const total = variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
	await Product.updateOne({ _id: id, isDeleted: false }, { $set: { variants, stock: total } });
	return findById(id);
};

// ---------------------------------------------------------------------------
// images
// ---------------------------------------------------------------------------

const addImages = async (id: string, images: TImage[]): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $push: { images: { $each: images } } });
	return findById(id);
};

const removeImage = async (id: string, imageUrl: string): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $pull: { images: { url: imageUrl } } });
	return findById(id);
};

const addVideos = async (id: string, videos: TImage[]): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $push: { videos: { $each: videos } } });
	return findById(id);
};

const removeVideo = async (id: string, videoUrl: string): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	await Product.updateOne({ _id: id, isDeleted: false }, { $pull: { videos: { url: videoUrl } } });
	return findById(id);
};

// ---------------------------------------------------------------------------
// inventory
// ---------------------------------------------------------------------------

const decrementLine = async (line: TStockLine): Promise<boolean> => {
	if (line.variantId) {
		const result = await Product.updateOne(
			{
				_id: line.productId,
				isDeleted: false,
				status: ProductStatus.Active,
				variants: { $elemMatch: { _id: line.variantId, isActive: true, stock: { $gte: line.quantity } } }
			},
			{ $inc: { 'variants.$.stock': -line.quantity, stock: -line.quantity } }
		);
		return result.modifiedCount === 1;
	}

	const result = await Product.updateOne(
		{ _id: line.productId, isDeleted: false, status: ProductStatus.Active, stock: { $gte: line.quantity } },
		{ $inc: { stock: -line.quantity } }
	);
	return result.modifiedCount === 1;
};

const incrementLine = async (line: TStockLine): Promise<void> => {
	if (line.variantId) {
		await Product.updateOne(
			{ _id: line.productId, 'variants._id': line.variantId },
			{ $inc: { 'variants.$.stock': line.quantity, stock: line.quantity } }
		);
		return;
	}
	await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } });
};

/**
 * Atomically decreases stock for every line. Each line is decremented with a conditional
 * update (`stock >= quantity`) so two concurrent orders can never oversell. If any line
 * fails, the already applied lines are restored and the failing line is reported back.
 */
const reserveStock = async (lines: TStockLine[]): Promise<TStockOperationResult> => {
	const applied: TStockLine[] = [];

	for (const line of lines) {
		if (!isValidId(line.productId)) {
			await Promise.all(applied.map(incrementLine));
			return { success: false, failedLine: line };
		}

		const ok = await decrementLine(line);
		if (!ok) {
			await Promise.all(applied.map(incrementLine));
			return { success: false, failedLine: line };
		}
		applied.push(line);
	}

	return { success: true };
};

/** Restores stock, used when an order is cancelled. */
const releaseStock = async (lines: TStockLine[]): Promise<void> => {
	for (const line of lines) {
		if (!isValidId(line.productId)) continue;
		await incrementLine(line);
	}
};

const adjustStock = async (id: string, stock: number, variantId?: string): Promise<TProduct | null> => {
	if (!isValidId(id)) return null;
	if (variantId) {
		if (!isValidId(variantId)) return null;
		await Product.updateOne({ _id: id, 'variants._id': variantId }, { $set: { 'variants.$.stock': stock } });
		await syncTotalStock(id);
		return findById(id);
	}
	const updated = await Product.findOneAndUpdate({ _id: id, isDeleted: false }, { stock }, { new: true })
		.populate('category', 'name slug')
		.lean();
	return updated ? toProduct(updated as TProductDocument) : null;
};

// ---------------------------------------------------------------------------
// reviews / statistics
// ---------------------------------------------------------------------------

const updateRating = async (id: string, ratingAverage: number, ratingCount: number): Promise<void> => {
	if (!isValidId(id)) return;
	await Product.updateOne({ _id: id }, { ratingAverage, ratingCount });
};

const count = async (filters: TProductFilters = {}): Promise<number> => Product.countDocuments(buildQuery(filters));

const countLowStock = async (threshold: number): Promise<number> =>
	Product.countDocuments({ isDeleted: false, status: ProductStatus.Active, stock: { $lte: threshold } });

const findLowStock = async (threshold: number, limit = 10): Promise<TProduct[]> => {
	const rows = await Product.find({ isDeleted: false, status: ProductStatus.Active, stock: { $lte: threshold } })
		.sort({ stock: 1 })
		.limit(limit)
		.populate('category', 'name slug')
		.lean();
	return rows.map((row) => toProduct(row as TProductDocument));
};

const ProductRepository = {
	create,
	findById,
	findBySlug,
	findBySku,
	findManyByIds,
	findMany,
	update,
	setStatus,
	softDelete,
	addVariant,
	updateVariant,
	setVariantMedia,
	removeVariant,
	replaceVariants,
	addImages,
	removeImage,
	addVideos,
	removeVideo,
	reserveStock,
	releaseStock,
	adjustStock,
	updateRating,
	count,
	countLowStock,
	findLowStock
};

export default ProductRepository;
