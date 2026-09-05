import { z } from 'zod';

const LoginValidation = z.object({
	body: z.object({
		email: z.string().email('Invalid email'),
		password: z.string().min(8, 'Password must be at least 8 characters')
	})
});

const AdminValidations = {
	LoginValidation
};

export default AdminValidations;
