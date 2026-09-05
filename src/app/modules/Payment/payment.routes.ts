import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard, { OptionalAuth } from '../../middlewares/AuthGuard';
import { strictLimiter } from '../../middlewares/rateLimiter';
import { uploadSingleImage } from '../../middlewares/upload';
import validateRequest from '../../middlewares/validateRequest';
import PaymentControllers from './payment.controllers';
import PaymentValidations from './payment.validations';

const router = express.Router();

// ---------------------------------------------------------------------------
// admin
// ---------------------------------------------------------------------------
router.get('/', AuthGuard(UserRole.Admin), PaymentControllers.getPayments);

router.patch(
	'/:id/verify',
	AuthGuard(UserRole.Admin),
	validateRequest(PaymentValidations.verifyPaymentValidation),
	PaymentControllers.verifyPayment
);

router.patch(
	'/:id/reject',
	AuthGuard(UserRole.Admin),
	validateRequest(PaymentValidations.rejectPaymentValidation),
	PaymentControllers.rejectPayment
);

router.patch(
	'/:id/refund',
	AuthGuard(UserRole.Admin),
	validateRequest(PaymentValidations.refundPaymentValidation),
	PaymentControllers.refundPayment
);

// screenshots are only readable by the admin or the customer who owns the order
router.get('/:id/screenshot', AuthGuard(UserRole.Admin, UserRole.Customer), PaymentControllers.getScreenshot);

// ---------------------------------------------------------------------------
// customer / guest
// ---------------------------------------------------------------------------
router.get('/orders/:orderId', OptionalAuth, PaymentControllers.getPaymentByOrder);

router.post(
	'/orders/:orderId/submit',
	strictLimiter,
	OptionalAuth,
	uploadSingleImage('screenshot'),
	validateRequest(PaymentValidations.submitPaymentValidation),
	PaymentControllers.submitPayment
);

const PaymentRoutes = router;

export default PaymentRoutes;
