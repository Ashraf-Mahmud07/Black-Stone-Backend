import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import SystemControllers from './system.controllers';
import SystemValidations from './system.validations';

const router = express.Router();

router.post(
	'/mail-to-company',
	validateRequest(SystemValidations.ClaimInvestmentValidation),
	SystemControllers.MailToCompany
);

const SystemRoutes = router;

export default SystemRoutes;
