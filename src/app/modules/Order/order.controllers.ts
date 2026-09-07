import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import OrderServices from './order.services';

const previewCheckout: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.previewCheckout(req.body, req.userData);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Checkout summary calculated successfully!',
		data: result
	});
});

const createOrder: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.createOrder(req.body, req.userData);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Order placed successfully!',
		data: result
	});
});

const getOrders: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await OrderServices.getOrders(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Orders retrieved successfully!',
		meta,
		data
	});
});

const getMyOrders: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await OrderServices.getMyOrders(req.user.id, req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Orders retrieved successfully!',
		meta,
		data
	});
});

const getOrderById: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.getOrderById(req.params.id, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Order retrieved successfully!',
		data: result
	});
});

const trackOrder: RequestHandler = catchAsync(async (req, res) => {
	const { orderNumber, phone } = req.body;
	const result = await OrderServices.trackOrder(orderNumber, phone);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Order retrieved successfully!',
		data: result
	});
});

const updateOrderStatus: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.updateOrderStatus(req.params.id, req.body, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Order status updated to ${req.body.status} successfully!`,
		data: result
	});
});

const cancelOrder: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.cancelOrder(req.params.id, req.user, req.body?.reason);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Order cancelled successfully!',
		data: result
	});
});

const adjustOrderPricing: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.adjustOrderPricing(req.params.id, req.body, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Order pricing updated successfully!',
		data: result
	});
});

const updateAdminNotes: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.updateAdminNotes(req.params.id, req.body.adminNotes);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Order note saved successfully!',
		data: result
	});
});

const getPaymentInstructions: RequestHandler = catchAsync(async (req, res) => {
	const result = await OrderServices.getPaymentInstructions(req.params.id, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment instructions retrieved successfully!',
		data: result
	});
});

const OrderControllers = {
	previewCheckout,
	createOrder,
	getOrders,
	getMyOrders,
	getOrderById,
	trackOrder,
	updateOrderStatus,
	adjustOrderPricing,
	cancelOrder,
	updateAdminNotes,
	getPaymentInstructions
};

export default OrderControllers;
