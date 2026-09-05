import { z } from 'zod';

const areaSchema = z.object({
	key: z.string({ required_error: 'Area key is required!' }).min(2, 'Area key is too short!'),
	name: z.string({ required_error: 'Area name is required!' }).min(2, 'Area name is too short!'),
	charge: z.number({ required_error: 'Charge is required!' }).nonnegative('Charge cannot be negative!'),
	estimatedDays: z.string().optional(),
	isActive: z.boolean().optional().default(true)
});

const updateDeliverySettingValidation = z.object({
	body: z.object({
		defaultCharge: z.number().nonnegative('Charge cannot be negative!').optional(),
		freeDeliveryEnabled: z.boolean().optional(),
		freeDeliveryThreshold: z.number().nonnegative('Threshold cannot be negative!').optional(),
		areas: z.array(areaSchema).optional(),
		note: z.string().max(500, 'Note is too long!').optional()
	})
});

const DeliveryValidations = {
	updateDeliverySettingValidation
};

export default DeliveryValidations;
