import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import validateRequest from '../../middlewares/validateRequest';
import DeliveryControllers from './delivery.controllers';
import DeliveryValidations from './delivery.validations';

const router = express.Router();

// public - the storefront needs the charges to show them at checkout
router.get('/settings', DeliveryControllers.getDeliverySetting);

// admin
router.patch(
	'/settings',
	AuthGuard(UserRole.Admin),
	validateRequest(DeliveryValidations.updateDeliverySettingValidation),
	DeliveryControllers.updateDeliverySetting
);

const DeliveryRoutes = router;

export default DeliveryRoutes;
