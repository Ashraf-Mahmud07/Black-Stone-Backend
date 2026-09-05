import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UserRole } from '../../interface/auth';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import UserServices from './user.services';

const changeUserStatus: RequestHandler = catchAsync(async (req, res) => {
	const { id } = req.params;
	const { status } = req.body;
	const result = await UserServices.changeUserStatus(id, status);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `User status updated to ${status} successfully!`,
		data: result
	});
});

const getUser: RequestHandler = catchAsync(async (req, res) => {
	const { id } = req.params;
	// customers may only read their own profile
	if (req.user.role !== UserRole.Admin && req.user.id !== id) {
		throw new AppError(httpStatus.FORBIDDEN, 'Access denied!');
	}
	const result = await UserServices.getUser(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User retrieved successfully!',
		data: result
	});
});

const getUsers: RequestHandler = catchAsync(async (req, res) => {
	const { data, meta } = await UserServices.getUsers(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Users retrieved successfully!',
		meta,
		data
	});
});

const updateMyProfile: RequestHandler = catchAsync(async (req, res) => {
	const result = await UserServices.updateUser(req.user.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Profile updated successfully!',
		data: result
	});
});

const deleteUser: RequestHandler = catchAsync(async (req, res) => {
	const { id } = req.params;
	const result = await UserServices.deleteUser(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User deleted successfully!',
		data: result
	});
});

const UserControllers = {
	changeUserStatus,
	getUser,
	getUsers,
	updateMyProfile,
	deleteUser
};

export default UserControllers;
