import config from '../../config';
import { OrderStatus, PaymentStatus } from '../Order/order.interfaces';
import OrderRepository from '../Order/order.repository';
import PaymentRepository from '../Payment/payment.repository';
import ProductRepository from '../Product/product.repository';
import { ProductStatus } from '../Product/product.interfaces';
import { ReviewStatus } from '../Review/review.interfaces';
import ReviewRepository from '../Review/review.repository';
import { Status } from '../User/user.interfaces';
import UserRepository from '../User/user.repository';

const LOW_STOCK_THRESHOLD = config.commerce.low_stock_threshold;

const getDashboardStats = async () => {
	const last30Days = new Date();
	last30Days.setDate(last30Days.getDate() - 30);

	const [
		ordersByStatus,
		totalOrders,
		totalCustomers,
		activeCustomers,
		totalProducts,
		activeProducts,
		lowStockCount,
		lowStockProducts,
		pendingVerification,
		pendingPayments,
		verifiedPayments,
		pendingReviews,
		revenueTotal,
		revenueLast30Days,
		recentOrders
	] = await Promise.all([
		OrderRepository.countByStatus(),
		OrderRepository.count(),
		UserRepository.count(),
		UserRepository.count({ status: Status.Active }),
		ProductRepository.count({ includeAllStatuses: true }),
		ProductRepository.count({ status: ProductStatus.Active }),
		ProductRepository.countLowStock(LOW_STOCK_THRESHOLD),
		ProductRepository.findLowStock(LOW_STOCK_THRESHOLD, 10),
		PaymentRepository.count({ status: PaymentStatus.Submitted }),
		PaymentRepository.count({ status: PaymentStatus.Pending }),
		PaymentRepository.count({ status: PaymentStatus.Verified }),
		ReviewRepository.count({ status: ReviewStatus.Pending }),
		OrderRepository.sumRevenue(),
		OrderRepository.sumRevenue(last30Days),
		OrderRepository.findRecent(5)
	]);

	return {
		orders: {
			total: totalOrders,
			pending: ordersByStatus[OrderStatus.Pending] ?? 0,
			confirmed: ordersByStatus[OrderStatus.Confirmed] ?? 0,
			processing: ordersByStatus[OrderStatus.Processing] ?? 0,
			shipped: ordersByStatus[OrderStatus.Shipped] ?? 0,
			completed: ordersByStatus[OrderStatus.Delivered] ?? 0,
			cancelled: ordersByStatus[OrderStatus.Cancelled] ?? 0
		},
		payments: {
			pendingVerification,
			awaitingPayment: pendingPayments,
			verified: verifiedPayments
		},
		customers: {
			total: totalCustomers,
			active: activeCustomers,
			blocked: totalCustomers - activeCustomers
		},
		products: {
			total: totalProducts,
			active: activeProducts,
			lowStock: lowStockCount,
			lowStockThreshold: LOW_STOCK_THRESHOLD
		},
		reviews: {
			pending: pendingReviews
		},
		revenue: {
			total: revenueTotal,
			last30Days: revenueLast30Days
		},
		recentOrders,
		lowStockProducts
	};
};

const AdminServices = {
	getDashboardStats
};

export default AdminServices;
