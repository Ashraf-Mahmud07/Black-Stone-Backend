import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { UserRole } from '../../interface/auth';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import CategoryServices from './category.services';

const createCategory: RequestHandler = catchAsync(async (req, res) => {
	const result = await CategoryServices.createCategory(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Category created successfully!',
		data: result
	});
});

const getCategories: RequestHandler = catchAsync(async (req, res) => {
	const isAdmin = req.userData?.role === UserRole.Admin;
	const { data, meta } = await CategoryServices.getCategories(req.query, { includeInactive: isAdmin });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Categories retrieved successfully!',
		meta,
		data
	});
});

const getCategoryBySlug: RequestHandler = catchAsync(async (req, res) => {
	const isAdmin = req.userData?.role === UserRole.Admin;
	const result = await CategoryServices.getCategoryBySlug(req.params.slug, { includeInactive: isAdmin });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Category retrieved successfully!',
		data: result
	});
});

const updateCategory: RequestHandler = catchAsync(async (req, res) => {
	const result = await CategoryServices.updateCategory(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Category updated successfully!',
		data: result
	});
});

const deactivateCategory: RequestHandler = catchAsync(async (req, res) => {
	const result = await CategoryServices.deactivateCategory(req.params.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Category deactivated successfully!',
		data: result
	});
});

const CategoryControllers = {
	createCategory,
	getCategories,
	getCategoryBySlug,
	updateCategory,
	deactivateCategory
};

export default CategoryControllers;
