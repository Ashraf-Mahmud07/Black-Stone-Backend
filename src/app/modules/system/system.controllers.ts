import { Request, RequestHandler, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import SystemServices from './system.services';

const MailToCompany: RequestHandler = catchAsync(async (req: Request, res: Response) => {
	const data = req.body;
	const response = await SystemServices.MailToCompany(data);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Mail sent successfully!',
		data: response
	});
});

const SystemControllers = {
	MailToCompany
};

export default SystemControllers;
