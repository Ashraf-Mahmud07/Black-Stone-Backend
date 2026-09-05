import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard, { OptionalAuth } from '../../middlewares/AuthGuard';
import { strictLimiter } from '../../middlewares/rateLimiter';
import validateRequest from '../../middlewares/validateRequest';
import OrderControllers from './order.controllers';
import OrderValidations from './order.validations';

const router = express.Router();

// ---------------------------------------------------------------------------
// checkout - works for guests and logged-in customers
// ---------------------------------------------------------------------------
router.post(
	'/checkout/preview',
	OptionalAuth,
	validateRequest(OrderValidations.previewCheckoutValidation),
	OrderControllers.previewCheckout
);

router.post(
	'/checkout',
	strictLimiter,
	OptionalAuth,
	validateRequest(OrderValidations.createOrderValidation),
	OrderControllers.createOrder
);

router.post('/track', validateRequest(OrderValidations.trackOrderValidation), OrderControllers.trackOrder);

// ---------------------------------------------------------------------------
// customer
// ---------------------------------------------------------------------------
router.get('/my-orders', AuthGuard(UserRole.Customer), OrderControllers.getMyOrders);

// ---------------------------------------------------------------------------
// admin
// ---------------------------------------------------------------------------
router.get('/', AuthGuard(UserRole.Admin), OrderControllers.getOrders);

router.patch(
	'/:id/status',
	AuthGuard(UserRole.Admin),
	validateRequest(OrderValidations.updateOrderStatusValidation),
	OrderControllers.updateOrderStatus
);

router.patch(
	'/:id/notes',
	AuthGuard(UserRole.Admin),
	validateRequest(OrderValidations.adminNotesValidation),
	OrderControllers.updateAdminNotes
);

// ---------------------------------------------------------------------------
// shared (owner or admin)
// ---------------------------------------------------------------------------
router.get('/:id', AuthGuard(UserRole.Customer, UserRole.Admin), OrderControllers.getOrderById);

router.get(
	'/:id/payment-instructions',
	AuthGuard(UserRole.Customer, UserRole.Admin),
	OrderControllers.getPaymentInstructions
);

router.patch(
	'/:id/cancel',
	AuthGuard(UserRole.Customer, UserRole.Admin),
	validateRequest(OrderValidations.cancelOrderValidation),
	OrderControllers.cancelOrder
);

const OrderRoutes = router;

export default OrderRoutes;
