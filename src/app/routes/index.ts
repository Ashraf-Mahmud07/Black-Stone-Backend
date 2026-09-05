import express from 'express';
import AdminRoutes from '../modules/Admin/admin.routes';
import AuthRoutes from '../modules/Auth/auth.routes';
import CartRoutes from '../modules/Cart/cart.routes';
import CategoryRoutes from '../modules/Category/category.routes';
import DeliveryRoutes from '../modules/Delivery/delivery.routes';
import OrderRoutes from '../modules/Order/order.routes';
import PaymentRoutes from '../modules/Payment/payment.routes';
import ProductRoutes from '../modules/Product/product.routes';
import ReviewRoutes from '../modules/Review/review.routes';
import SystemRoutes from '../modules/system/system.routes';
import UserRoutes from '../modules/User/user.routes';

const router = express.Router();

/** Base path every module router is mounted under. */
export const API_PREFIX = '/api';

export const moduleRoutes = [
	{
		path: '/auth',
		route: AuthRoutes
	},
	{
		path: '/users',
		route: UserRoutes
	},
	{
		path: '/categories',
		route: CategoryRoutes
	},
	{
		path: '/products',
		route: ProductRoutes
	},
	{
		path: '/cart',
		route: CartRoutes
	},
	{
		path: '/orders',
		route: OrderRoutes
	},
	{
		path: '/payments',
		route: PaymentRoutes
	},
	{
		path: '/reviews',
		route: ReviewRoutes
	},
	{
		path: '/delivery',
		route: DeliveryRoutes
	},
	{
		path: '/admin',
		route: AdminRoutes
	},
	{
		path: '/system',
		route: SystemRoutes
	}
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
