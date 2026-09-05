import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import validateRequest from '../../middlewares/validateRequest';
import CartControllers from './cart.controllers';
import CartValidations from './cart.validations';

const router = express.Router();

// the server side cart belongs to a logged-in customer.
// guests check out directly with the `items` payload (Buy Now / local cart).
router.use(AuthGuard(UserRole.Customer));

router.get('/', CartControllers.getCart);

router.post('/items', validateRequest(CartValidations.addItemValidation), CartControllers.addItem);

router.patch('/items', validateRequest(CartValidations.updateItemValidation), CartControllers.updateItem);

router.delete('/items', validateRequest(CartValidations.removeItemValidation), CartControllers.removeItem);

router.delete('/', CartControllers.clearCart);

const CartRoutes = router;

export default CartRoutes;
