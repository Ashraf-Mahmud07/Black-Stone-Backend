import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TImage, TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import { getEffectivePrice } from '../../utils/pricing';
import { slugify, uniqueSuffix } from '../../utils/slugify';
import { storage, StorageFolders, TUploadedFile } from '../../utils/storage';
import CategoryRepository from '../Category/category.repository';
import {
	ProductStatus,
	TCreateProductPayload,
	TProduct,
	TProductFilters,
	TResolvedLine,
	TUpdateProductPayload,
	TVariantPayload
} from './product.interfaces';
import ProductRepository from './product.repository';

const MAX_PRODUCT_IMAGES = 16;
const MAX_VARIANT_IMAGES = 6;
const MAX_PRODUCT_VIDEOS = 16;

const buildUniqueSlug = async (source: string, currentId?: string): Promise<string> => {
	const base = slugify(source);
	if (!base) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Unable to generate a slug from the given product name!');
	}
	const existing = await ProductRepository.findBySlug(base);
	if (!existing || existing.id === currentId) return base;
	return `${base}-${uniqueSuffix(4)}`;
};

const buildUniqueSku = async (name: string): Promise<string> => {
	const prefix = slugify(name).replace(/-/g, '').slice(0, 6).toUpperCase() || 'BSTONE';
	let sku = `${prefix}-${uniqueSuffix(5).toUpperCase()}`;
	// extremely unlikely to collide, but never issue a duplicate SKU
	while (await ProductRepository.findBySku(sku)) {
		sku = `${prefix}-${uniqueSuffix(5).toUpperCase()}`;
	}
	return sku;
};

const assertVariantsAreValid = (variants: TVariantPayload[] = []): void => {
	const skus = variants.map((variant) => variant.sku?.trim().toUpperCase()).filter(Boolean);
	if (skus.length !== variants.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Every variant requires a SKU!');
	}
	if (new Set(skus).size !== skus.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Variant SKUs must be unique within a product!');
	}
	variants.forEach((variant) => {
		if (variant.discountPrice !== undefined && variant.price !== undefined && variant.discountPrice >= variant.price) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Variant discount price must be lower than the variant price!');
		}
	});
};

const assertCategoryExists = async (categoryId: string): Promise<void> => {
	const category = await CategoryRepository.findById(categoryId);
	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, 'Category not found!');
	}
	if (!category.isActive) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Category is not active!');
	}
};

const createProduct = async (payload: TCreateProductPayload): Promise<TProduct> => {
	await assertCategoryExists(payload.categoryId);
	assertVariantsAreValid(payload.variants);

	if (payload.discountPrice !== undefined && payload.discountPrice >= payload.price) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Discount price must be lower than the price!');
	}

	if (payload.sku) {
		const duplicate = await ProductRepository.findBySku(payload.sku);
		if (duplicate) {
			throw new AppError(httpStatus.CONFLICT, 'A product with this SKU already exists!');
		}
	}

	const slug = await buildUniqueSlug(payload.slug || payload.name);
	const sku = payload.sku ? payload.sku.toUpperCase() : await buildUniqueSku(payload.name);

	// when variants exist the total stock is always derived from them
	const stock = payload.variants?.length
		? payload.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
		: (payload.stock ?? 0);

	return ProductRepository.create({ ...payload, slug, sku, stock });
};

const updateProduct = async (id: string, payload: TUpdateProductPayload): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}

	if (payload.categoryId) await assertCategoryExists(payload.categoryId);

	const nextPrice = payload.price ?? product.price;
	const nextDiscount = payload.discountPrice ?? product.discountPrice;
	if (nextDiscount !== undefined && nextDiscount >= nextPrice) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Discount price must be lower than the price!');
	}

	if (payload.sku) {
		const duplicate = await ProductRepository.findBySku(payload.sku);
		if (duplicate && duplicate.id !== id) {
			throw new AppError(httpStatus.CONFLICT, 'A product with this SKU already exists!');
		}
	}

	const nextPayload: TUpdateProductPayload & { slug?: string } = { ...payload };
	if (payload.slug || (payload.name && payload.name !== product.name)) {
		nextPayload.slug = await buildUniqueSlug(payload.slug || (payload.name as string), id);
	}
	if (payload.sku) nextPayload.sku = payload.sku.toUpperCase();
	// variants are managed through the dedicated variant endpoints
	delete nextPayload.variants;
	if (product.variants.length) delete nextPayload.stock;

	const updated = await ProductRepository.update(id, nextPayload);
	if (!updated) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	return updated;
};

/** Soft delete only - historical orders must keep resolving their products. */
const deleteProduct = async (id: string): Promise<TProduct> => {
	const deleted = await ProductRepository.softDelete(id);
	if (!deleted) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	return deleted;
};

const parseNumber = (value: unknown): number | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const SORTABLE_FIELDS = ['createdAt', 'price', 'name', 'ratingAverage', 'stock'];

const getProducts = async (
	query: Record<string, unknown>,
	options: { isAdmin?: boolean } = {}
): Promise<TPaginatedResult<TProduct>> => {
	const pagination = calculatePagination(query, { sortBy: 'createdAt', sortOrder: 'desc' });
	if (!SORTABLE_FIELDS.includes(pagination.sortBy)) pagination.sortBy = 'createdAt';

	let categoryId = typeof query.category === 'string' && query.category ? query.category : undefined;
	if (typeof query.categorySlug === 'string' && query.categorySlug) {
		const category = await CategoryRepository.findBySlug(query.categorySlug);
		if (!category) {
			return { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPage: 0 } };
		}
		categoryId = category.id;
	}

	const filters: TProductFilters = {
		search: typeof query.search === 'string' ? query.search : undefined,
		categoryId,
		minPrice: parseNumber(query.minPrice),
		maxPrice: parseNumber(query.maxPrice),
		featured: query.featured === undefined ? undefined : query.featured === 'true',
		inStock: query.inStock === 'true',
		tags:
			typeof query.tags === 'string'
				? query.tags
						.split(',')
						.map((tag) => tag.trim())
						.filter(Boolean)
				: undefined,
		// only admins may see draft / inactive products
		status: options.isAdmin && typeof query.status === 'string' ? (query.status as ProductStatus) : undefined,
		includeAllStatuses: Boolean(options.isAdmin)
	};

	return ProductRepository.findMany(filters, pagination);
};

const assertVisible = (product: TProduct | null, isAdmin?: boolean): TProduct => {
	if (!product || (!isAdmin && product.status !== ProductStatus.Active)) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	return product;
};

const getProductBySlug = async (slug: string, options: { isAdmin?: boolean } = {}): Promise<TProduct> =>
	assertVisible(await ProductRepository.findBySlug(slug), options.isAdmin);

const getProductById = async (id: string, options: { isAdmin?: boolean } = {}): Promise<TProduct> =>
	assertVisible(await ProductRepository.findById(id), options.isAdmin);

// ---------------------------------------------------------------------------
// inventory
// ---------------------------------------------------------------------------

const updateStock = async (id: string, payload: { stock: number; variantId?: string }): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (payload.variantId && !product.variants.some((variant) => variant.id === payload.variantId)) {
		throw new AppError(httpStatus.NOT_FOUND, 'Variant not found!');
	}
	if (!payload.variantId && product.variants.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'This product tracks stock per variant. Please provide a variantId.');
	}

	const updated = await ProductRepository.adjustStock(id, payload.stock, payload.variantId);
	return updated as TProduct;
};

// ---------------------------------------------------------------------------
// variants
// ---------------------------------------------------------------------------

const addVariant = async (id: string, payload: TVariantPayload): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	assertVariantsAreValid([...product.variants, payload]);
	const updated = await ProductRepository.addVariant(id, payload);
	return updated as TProduct;
};

const updateVariant = async (id: string, variantId: string, payload: Partial<TVariantPayload>): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (!product.variants.some((variant) => variant.id === variantId)) {
		throw new AppError(httpStatus.NOT_FOUND, 'Variant not found!');
	}
	const updated = await ProductRepository.updateVariant(id, variantId, payload);
	return updated as TProduct;
};

const removeVariant = async (id: string, variantId: string): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (!product.variants.some((variant) => variant.id === variantId)) {
		throw new AppError(httpStatus.NOT_FOUND, 'Variant not found!');
	}
	const updated = await ProductRepository.removeVariant(id, variantId);
	return updated as TProduct;
};

// ---------------------------------------------------------------------------
// images
// ---------------------------------------------------------------------------

const addImages = async (id: string, files: TUploadedFile[]): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (!files.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'At least one image file is required!');
	}
	if (product.images.length + files.length > MAX_PRODUCT_IMAGES) {
		throw new AppError(httpStatus.BAD_REQUEST, `A product can have at most ${MAX_PRODUCT_IMAGES} images!`);
	}

	const stored = await Promise.all(
		files.map((file) => storage.save(file, { folder: StorageFolders.products, resourceType: 'image' }))
	);
	const images: TImage[] = stored.map((file, index) => ({
		url: file.url,
		key: file.key,
		resourceType: 'image',
		width: file.width,
		height: file.height,
		isPrimary: product.images.length === 0 && index === 0
	}));

	const updated = await ProductRepository.addImages(id, images);
	return updated as TProduct;
};

const removeImage = async (id: string, imageUrl: string): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	const image = product.images.find((item) => item.url === imageUrl);
	if (!image) {
		throw new AppError(httpStatus.NOT_FOUND, 'Image not found on this product!');
	}

	const updated = await ProductRepository.removeImage(id, imageUrl);
	if (image.key) {
		// storage cleanup must never break the API response
		await storage.remove(image.key).catch(() => undefined);
	}
	return updated as TProduct;
};

// ---------------------------------------------------------------------------
// variant (per colour) images
// ---------------------------------------------------------------------------

const loadVariant = async (id: string, variantId: string) => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	const variant = product.variants.find((item) => item.id === variantId);
	if (!variant) {
		throw new AppError(httpStatus.NOT_FOUND, 'Variant not found!');
	}
	return { product, variant };
};

/**
 * Uploads images for one colour variant through the same storage provider the product
 * gallery uses. The first image uploaded to a variant without one becomes its primary.
 */
const addVariantImages = async (id: string, variantId: string, files: TUploadedFile[]): Promise<TProduct> => {
	const { variant } = await loadVariant(id, variantId);

	if (!files.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'At least one image file is required!');
	}
	if (variant.images.length + files.length > MAX_VARIANT_IMAGES) {
		throw new AppError(httpStatus.BAD_REQUEST, `A variant can have at most ${MAX_VARIANT_IMAGES} images!`);
	}

	const stored = await Promise.all(
		files.map((file) => storage.save(file, { folder: StorageFolders.products, resourceType: 'image' }))
	);
	const uploaded: TImage[] = stored.map((file) => ({
		url: file.url,
		key: file.key,
		resourceType: 'image',
		width: file.width,
		height: file.height
	}));

	const images = [...variant.images, ...uploaded];
	const updated = await ProductRepository.setVariantMedia(id, variantId, {
		image: variant.image ?? uploaded[0],
		images
	});
	return updated as TProduct;
};

const removeVariantImage = async (id: string, variantId: string, imageUrl: string): Promise<TProduct> => {
	const { variant } = await loadVariant(id, variantId);

	const target =
		variant.images.find((item) => item.url === imageUrl) ??
		(variant.image?.url === imageUrl ? variant.image : undefined);
	if (!target) {
		throw new AppError(httpStatus.NOT_FOUND, 'Image not found on this variant!');
	}

	const images = variant.images.filter((item) => item.url !== imageUrl);
	// when the primary is removed, promote the next image - or leave the variant with none
	const image = variant.image?.url === imageUrl ? images[0] : variant.image;

	const updated = await ProductRepository.setVariantMedia(id, variantId, { image, images });
	if (target.key) {
		await storage.remove(target.key).catch(() => undefined);
	}
	return updated as TProduct;
};

// ---------------------------------------------------------------------------
// videos
// ---------------------------------------------------------------------------

const addVideos = async (id: string, files: TUploadedFile[]): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (!files.length) {
		throw new AppError(httpStatus.BAD_REQUEST, 'At least one video file is required!');
	}
	if (product.videos.length + files.length > MAX_PRODUCT_VIDEOS) {
		throw new AppError(httpStatus.BAD_REQUEST, `A product can have at most ${MAX_PRODUCT_VIDEOS} videos!`);
	}

	const stored = await Promise.all(
		files.map((file) => storage.save(file, { folder: StorageFolders.products, resourceType: 'video' }))
	);
	const videos: TImage[] = stored.map((file) => ({
		url: file.url,
		key: file.key,
		resourceType: 'video',
		thumbnailUrl: file.thumbnailUrl,
		width: file.width,
		height: file.height,
		duration: file.duration
	}));

	const updated = await ProductRepository.addVideos(id, videos);
	return updated as TProduct;
};

const removeVideo = async (id: string, videoUrl: string): Promise<TProduct> => {
	const product = await ProductRepository.findById(id);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	const video = product.videos.find((item) => item.url === videoUrl);
	if (!video) {
		throw new AppError(httpStatus.NOT_FOUND, 'Video not found on this product!');
	}

	const updated = await ProductRepository.removeVideo(id, videoUrl);
	if (video.key) {
		await storage.remove(video.key).catch(() => undefined);
	}
	return updated as TProduct;
};

// ---------------------------------------------------------------------------
// shared purchase helpers (used by cart, checkout and orders)
// ---------------------------------------------------------------------------

/**
 * Resolves a requested product/variant against trusted database data and validates
 * availability. Cart, Buy Now and checkout all go through this single implementation.
 */
const resolvePurchasableLine = async (
	productId: string,
	quantity: number,
	variantId?: string
): Promise<TResolvedLine> => {
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Quantity must be a positive whole number!');
	}

	const product = await ProductRepository.findById(productId);
	if (!product) {
		throw new AppError(httpStatus.NOT_FOUND, 'Product not found!');
	}
	if (product.status !== ProductStatus.Active) {
		throw new AppError(httpStatus.BAD_REQUEST, `"${product.name}" is not available right now!`);
	}

	if (product.variants.length && !variantId) {
		throw new AppError(httpStatus.BAD_REQUEST, `Please select a variant for "${product.name}".`);
	}

	let variant;
	if (variantId) {
		variant = product.variants.find((item) => item.id === variantId);
		if (!variant) {
			throw new AppError(httpStatus.NOT_FOUND, 'Selected variant not found!');
		}
		if (!variant.isActive) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Selected variant is not available right now!');
		}
	}

	const availableStock = variant ? variant.stock : product.stock;
	if (availableStock < quantity) {
		throw new AppError(httpStatus.CONFLICT, `Only ${availableStock} item(s) left in stock for "${product.name}".`);
	}

	const listPrice = variant?.price ?? product.price;
	const discountPrice = variant?.price !== undefined ? variant.discountPrice : product.discountPrice;

	return {
		product,
		variant,
		quantity,
		listPrice,
		unitPrice: getEffectivePrice(listPrice, discountPrice),
		availableStock
	};
};

const ProductServices = {
	createProduct,
	updateProduct,
	deleteProduct,
	getProducts,
	getProductBySlug,
	getProductById,
	updateStock,
	addVariant,
	updateVariant,
	removeVariant,
	addImages,
	removeImage,
	addVariantImages,
	removeVariantImage,
	addVideos,
	removeVideo,
	resolvePurchasableLine
};

export default ProductServices;
