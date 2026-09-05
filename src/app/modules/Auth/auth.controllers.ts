import { CookieOptions, RequestHandler } from 'express';
import httpStatus from 'http-status';
import config from '../../config';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AuthServices from './auth.services';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions: CookieOptions = {
	httpOnly: true,
	secure: config.NODE_ENV === 'production',
	sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
	maxAge: config.jwt_refresh_expiration * 1000
};

const register: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.register(req.body);
	res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Account registered successfully!',
		data: result
	});
});

const login: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.login(req.body);
	res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Logged in successfully!',
		data: result
	});
});

const loginAdmin: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.loginAdmin(req.body);
	res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Admin logged in successfully!',
		data: result
	});
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
	const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
	const result = await AuthServices.refreshToken(token);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Access token refreshed successfully!',
		data: result
	});
});

const getMe: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.getMe(req.user.id, req.user.role);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User retrieved successfully!',
		data: result
	});
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.changePassword(req.user.id, req.body);
	res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null
	});
});

const logout: RequestHandler = catchAsync(async (req, res) => {
	const result = await AuthServices.logout(req.user.id, req.user.role);
	res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null
	});
});

const AuthControllers = {
	register,
	login,
	loginAdmin,
	refreshToken,
	getMe,
	changePassword,
	logout
};

export default AuthControllers;
