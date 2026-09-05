import { z } from 'zod';

const ClaimInvestmentValidation = z.object({
	body: z.object({
		name: z.string().min(3, 'Name is required'),
		mobile: z.string().min(11, 'Mobile number is required'),
		actual_amount: z.number().positive('Actual amount is required'),
		due_amount: z.number().positive('Due amount is required'),
		reference: z.string().min(1, 'Reference is required'),
		investment_type: z.enum(['ips', 'share'], {
			required_error: 'Investment type is required'
		})
	})
});

const SystemValidations = {
	ClaimInvestmentValidation
};

export default SystemValidations;
