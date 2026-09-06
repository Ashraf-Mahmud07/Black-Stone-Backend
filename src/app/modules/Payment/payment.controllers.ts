import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TUploadedFile } from '../../utils/storage';
import PaymentServices from './payment.services';

const getPaymentByOrder: RequestHandler = catchAsync(async (req, res) => {
	const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;
	const result = await PaymentServices.getPaymentByOrder(req.params.orderId, req.userData, phone);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment retrieved successfully!',
		data: result
	});
});

const submitPayment: RequestHandler = catchAsync(async (req, res) => {
	const file = req.file as TUploadedFile | undefined;
	const result = await PaymentServices.submitPayment(req.params.orderId, req.body, file, req.userData);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment information submitted! Our team will verify it shortly.',
		data: result
	});
});

const getPayments: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await PaymentServices.getPayments(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payments retrieved successfully!',
		meta,
		data
	});
});

const verifyPayment: RequestHandler = catchAsync(async (req, res) => {
	const result = await PaymentServices.verifyPayment(req.params.id, req.user, req.body?.note);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment verified successfully!',
		data: result
	});
});

const rejectPayment: RequestHandler = catchAsync(async (req, res) => {
	const result = await PaymentServices.rejectPayment(req.params.id, req.user, req.body.rejectionReason);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment rejected!',
		data: result
	});
});

const refundPayment: RequestHandler = catchAsync(async (req, res) => {
	const result = await PaymentServices.refundPayment(req.params.id, req.user, req.body?.note);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Payment marked as refunded!',
		data: result
	});
});

/**
 * Screenshots are read through this authorised endpoint - they are never public files.
 * Local storage streams the file; Cloudinary redirects to a signed, private delivery url.
 */
const getScreenshot: RequestHandler = catchAsync(async (req, res) => {
	const location = await PaymentServices.getScreenshotLocation(req.params.id, req.user);

	if (location.kind === 'path') {
		res.sendFile(location.path);
		return;
	}
	res.redirect(httpStatus.FOUND, location.url);
});

const PaymentControllers = {
	getPaymentByOrder,
	submitPayment,
	getPayments,
	verifyPayment,
	rejectPayment,
	refundPayment,
	getScreenshot
};

export default PaymentControllers;
