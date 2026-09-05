import { z } from 'zod';

export const passwordSchema = z
	.string({ required_error: 'Password is required!' })
	.min(8, 'Password must be at least 8 characters long!')
	.regex(/[a-zA-Z]/, 'Password must contain at least one letter!')
	.regex(/\d/, 'Password must contain at least one number!');

export const phoneSchema = z
	.string()
	.regex(/^(?:\+?88)?01[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number!');

const registerValidation = z.object({
	body: z.object({
		name: z.string({ required_error: 'Name is required!' }).min(2, 'Name must be at least 2 characters long!'),
		username: z.string().min(3, 'Username must be at least 3 characters long!').optional(),
		email: z.string({ required_error: 'Email is required!' }).email('Invalid email address!'),
		phone: phoneSchema.optional(),
		password: passwordSchema
	})
});

const loginValidation = z.object({
	body: z.object({
		email: z.string({ required_error: 'Email is required!' }).email('Invalid email address!'),
		password: z.string({ required_error: 'Password is required!' }).min(1, 'Password is required!')
	})
});

const refreshTokenValidation = z.object({
	body: z
		.object({
			refreshToken: z.string().optional()
		})
		.optional()
});

const changePasswordValidation = z.object({
	body: z.object({
		oldPassword: z.string({ required_error: 'Current password is required!' }),
		newPassword: passwordSchema
	})
});

const AuthValidations = {
	registerValidation,
	loginValidation,
	refreshTokenValidation,
	changePasswordValidation
};

export default AuthValidations;
