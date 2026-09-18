import { z } from 'zod';
import { ProductStatus } from './product.interfaces';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID!');

const imageSchema = z.object({
	url: z.string().url('Invalid image url!'),
	key: z.string().optional(),
	alt: z.string().optional(),
	isPrimary: z.boolean().optional()
});

const specificationSchema = z.object({
	key: z.string({ required_error: 'Specification key is required!' }).min(1),
	value: z.string({ required_error: 'Specification value is required!' }).min(1)
});

const seoSchema = z.object({
	title: z.string().max(120, 'SEO title is too long!').optional(),
	description: z.string().max(320, 'SEO description is too long!').optional(),
	keywords: z.array(z.string()).optional()
});

const variantSchema = z.object({
	sku: z.string({ required_error: 'Variant SKU is required!' }).min(2, 'Variant SKU is too short!'),
	color: z.string().optional(),
	colorBn: z.string().optional(),
	size: z.string().optional(),
	design: z.string().optional(),
	attributes: z.record(z.string()).optional(),
	price: z.number().nonnegative('Price cannot be negative!').optional(),
	discountPrice: z.number().nonnegative('Discount price cannot be negative!').optional(),
	stock: z.number().int('Stock must be a whole number!').nonnegative('Stock cannot be negative!'),
	image: imageSchema.optional(),
	images: z.array(imageSchema).max(6, 'A variant can have at most 6 images!').optional(),
	isActive: z.boolean().optional()
});

const createProductValidation = z.object({
	body: z.object({
		name: z.string({ required_error: 'Product name is required!' }).min(2, 'Product name is too short!'),
		slug: z.string().optional(),
		description: z.string({ required_error: 'Description is required!' }).min(10, 'Description is too short!'),
		shortDescription: z.string().max(300, 'Short description is too long!').optional(),
		categoryId: objectId,
		images: z.array(imageSchema).optional(),
		price: z.number({ required_error: 'Price is required!' }).positive('Price must be greater than 0!'),
		discountPrice: z.number().nonnegative('Discount price cannot be negative!').optional(),
		sku: z.string().min(2, 'SKU is too short!').optional(),
		variants: z.array(variantSchema).optional(),
		specifications: z.array(specificationSchema).optional(),
		stock: z.number().int('Stock must be a whole number!').nonnegative('Stock cannot be negative!').optional(),
		status: z.nativeEnum(ProductStatus).optional(),
		featured: z.boolean().optional(),
		tags: z.array(z.string()).optional(),
		seo: seoSchema.optional()
	})
});

const updateProductValidation = z.object({
	body: z.object({
		name: z.string().min(2, 'Product name is too short!').optional(),
		slug: z.string().optional(),
		description: z.string().min(10, 'Description is too short!').optional(),
		shortDescription: z.string().max(300, 'Short description is too long!').optional(),
		categoryId: objectId.optional(),
		images: z.array(imageSchema).optional(),
		price: z.number().positive('Price must be greater than 0!').optional(),
		discountPrice: z.number().nonnegative('Discount price cannot be negative!').optional(),
		sku: z.string().min(2, 'SKU is too short!').optional(),
		specifications: z.array(specificationSchema).optional(),
		stock: z.number().int('Stock must be a whole number!').nonnegative('Stock cannot be negative!').optional(),
		status: z.nativeEnum(ProductStatus).optional(),
		featured: z.boolean().optional(),
		tags: z.array(z.string()).optional(),
		seo: seoSchema.optional()
	})
});

const updateStockValidation = z.object({
	body: z.object({
		stock: z
			.number({ required_error: 'Stock is required!' })
			.int('Stock must be a whole number!')
			.nonnegative('Stock cannot be negative!'),
		variantId: objectId.optional()
	})
});

const createVariantValidation = z.object({
	body: variantSchema
});

const updateVariantValidation = z.object({
	body: variantSchema.partial()
});

const removeImageValidation = z.object({
	body: z.object({
		url: z.string({ required_error: 'Image url is required!' }).url('Invalid image url!')
	})
});

const removeVariantImageValidation = z.object({
	body: z.object({
		url: z.string({ required_error: 'Image url is required!' }).url('Invalid image url!')
	})
});

const removeVideoValidation = z.object({
	body: z.object({
		url: z.string({ required_error: 'Video url is required!' }).url('Invalid video url!')
	})
});

const ProductValidations = {
	createProductValidation,
	updateProductValidation,
	updateStockValidation,
	createVariantValidation,
	updateVariantValidation,
	removeImageValidation,
	removeVariantImageValidation,
	removeVideoValidation
};

export default ProductValidations;
