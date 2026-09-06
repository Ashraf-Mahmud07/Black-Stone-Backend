import { z } from 'zod';
import { phoneSchema } from '../Auth/auth.validations';

const TPictureValidation = z.object({
	url: z.string().url({ message: 'Invalid URL!' }),
	publicId: z.string({ required_error: 'Public ID is required!' })
});

const addressValidation = z.object({
	label: z.string().optional(),
	name: z.string().optional(),
	phone: phoneSchema.optional(),
	address: z.string({ required_error: 'Address is required!' }).min(5, 'Address is too short!'),
	deliveryNotes: z.string().max(500, 'Delivery notes are too long!').optional(),
	isDefault: z.boolean().optional()
});

const updateUserValidation = z.object({
	body: z.object({
		username: z.string().min(3, { message: 'Username must be at least 3 characters long!' }).optional(),
		name: z.string().min(2, { message: 'Name must be at least 2 characters long!' }).optional(),
		phone: phoneSchema.optional(),
		location: z.string().optional(),
		picture: TPictureValidation.optional(),
		addresses: z.array(addressValidation).optional()
	})
});

const changeStatusValidation = z.object({
	body: z.object({
		status: z.enum(['active', 'blocked'], { required_error: 'Status is required!' })
	})
});

const UserValidations = {
	updateUserValidation,
	changeStatusValidation
};

export default UserValidations;
