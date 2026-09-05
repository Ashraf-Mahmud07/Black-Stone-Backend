import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CartServices from './cart.services';

const getCart: RequestHandler = catchAsync(async (req, res) => {
	const result = await CartServices.getCart(req.user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Cart retrieved successfully!',
		data: result
	});
});

const addItem: RequestHandler = catchAsync(async (req, res) => {
	const result = await CartServices.addItem(req.user.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Item added to cart successfully!',
		data: result
	});
});

const updateItem: RequestHandler = catchAsync(async (req, res) => {
	const { productId, variantId, quantity } = req.body;
	const result = await CartServices.updateItemQuantity(req.user.id, { productId, variantId }, quantity);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Cart item updated successfully!',
		data: result
	});
});

const removeItem: RequestHandler = catchAsync(async (req, res) => {
	const { productId, variantId } = req.body;
	const result = await CartServices.removeItem(req.user.id, { productId, variantId });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Cart item removed successfully!',
		data: result
	});
});

const clearCart: RequestHandler = catchAsync(async (req, res) => {
	const result = await CartServices.clearCart(req.user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Cart cleared successfully!',
		data: result
	});
});

const CartControllers = {
	getCart,
	addItem,
	updateItem,
	removeItem,
	clearCart
};

export default CartControllers;
