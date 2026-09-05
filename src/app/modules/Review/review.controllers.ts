import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ReviewServices from './review.services';

const createReview: RequestHandler = catchAsync(async (req, res) => {
	const result = await ReviewServices.createReview(req.body, req.user);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Review submitted successfully! It will be published once approved.',
		data: result
	});
});

const getProductReviews: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await ReviewServices.getProductReviews(req.params.productId, req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Reviews retrieved successfully!',
		meta,
		data
	});
});

const getMyReviews: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await ReviewServices.getMyReviews(req.user.id, req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Reviews retrieved successfully!',
		meta,
		data
	});
});

const getReviews: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await ReviewServices.getReviews(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Reviews retrieved successfully!',
		meta,
		data
	});
});

const updateReview: RequestHandler = catchAsync(async (req, res) => {
	const result = await ReviewServices.updateReview(req.params.id, req.body, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Review updated successfully! It will be published once approved.',
		data: result
	});
});

const moderateReview: RequestHandler = catchAsync(async (req, res) => {
	const result = await ReviewServices.moderateReview(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Review ${req.body.status} successfully!`,
		data: result
	});
});

const deleteReview: RequestHandler = catchAsync(async (req, res) => {
	const result = await ReviewServices.deleteReview(req.params.id, req.user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Review deleted successfully!',
		data: result
	});
});

const ReviewControllers = {
	createReview,
	getProductReviews,
	getMyReviews,
	getReviews,
	updateReview,
	moderateReview,
	deleteReview
};

export default ReviewControllers;
