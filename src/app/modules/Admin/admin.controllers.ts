import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AdminServices from './admin.services';

const getDashboardStats: RequestHandler = catchAsync(async (req, res) => {
	const result = await AdminServices.getDashboardStats();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Dashboard statistics retrieved successfully!',
		data: result
	});
});

const AdminControllers = {
	getDashboardStats
};

export default AdminControllers;
