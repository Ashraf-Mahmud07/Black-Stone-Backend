import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import DeliveryServices from './delivery.services';

const getDeliverySetting: RequestHandler = catchAsync(async (req, res) => {
	const result = await DeliveryServices.getDeliverySetting();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Delivery settings retrieved successfully!',
		data: result
	});
});

const updateDeliverySetting: RequestHandler = catchAsync(async (req, res) => {
	const result = await DeliveryServices.updateDeliverySetting(req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Delivery settings updated successfully!',
		data: result
	});
});

const DeliveryControllers = {
	getDeliverySetting,
	updateDeliverySetting
};

export default DeliveryControllers;
