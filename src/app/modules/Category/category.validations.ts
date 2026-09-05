import { z } from 'zod';

const imageSchema = z.object({
	url: z.string().url('Invalid image url!'),
	key: z.string().optional(),
	alt: z.string().optional()
});

const createCategoryValidation = z.object({
	body: z.object({
		name: z.string({ required_error: 'Category name is required!' }).min(2, 'Category name is too short!'),
		slug: z.string().optional(),
		description: z.string().max(1000, 'Description is too long!').optional(),
		image: imageSchema.optional(),
		sortOrder: z.number().int().min(0).optional(),
		isActive: z.boolean().optional()
	})
});

const updateCategoryValidation = z.object({
	body: z.object({
		name: z.string().min(2, 'Category name is too short!').optional(),
		slug: z.string().optional(),
		description: z.string().max(1000, 'Description is too long!').optional(),
		image: imageSchema.optional(),
		sortOrder: z.number().int().min(0).optional(),
		isActive: z.boolean().optional()
	})
});

const CategoryValidations = {
	createCategoryValidation,
	updateCategoryValidation
};

export default CategoryValidations;
