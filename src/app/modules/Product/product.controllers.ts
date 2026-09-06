import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { UserRole } from '../../interface/auth';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TUploadedFile } from '../../utils/storage';
import ProductServices from './product.services';

const createProduct: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.createProduct(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Product created successfully!',
		data: result
	});
});

const getProducts: RequestHandler = catchAsync(async (req, res) => {
	const isAdmin = req.userData?.role === UserRole.Admin;
	const { data, meta } = await ProductServices.getProducts(req.query, { isAdmin });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Products retrieved successfully!',
		meta,
		data
	});
});

const getProductBySlug: RequestHandler = catchAsync(async (req, res) => {
	const isAdmin = req.userData?.role === UserRole.Admin;
	const result = await ProductServices.getProductBySlug(req.params.slug, { isAdmin });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product retrieved successfully!',
		data: result
	});
});

const getProductById: RequestHandler = catchAsync(async (req, res) => {
	const isAdmin = req.userData?.role === UserRole.Admin;
	const result = await ProductServices.getProductById(req.params.id, { isAdmin });
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product retrieved successfully!',
		data: result
	});
});

const updateProduct: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.updateProduct(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product updated successfully!',
		data: result
	});
});

const deleteProduct: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.deleteProduct(req.params.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product deleted successfully!',
		data: result
	});
});

const updateStock: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.updateStock(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Stock updated successfully!',
		data: result
	});
});

const addVariant: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.addVariant(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Variant added successfully!',
		data: result
	});
});

const updateVariant: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.updateVariant(req.params.id, req.params.variantId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Variant updated successfully!',
		data: result
	});
});

const removeVariant: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.removeVariant(req.params.id, req.params.variantId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Variant removed successfully!',
		data: result
	});
});

const addImages: RequestHandler = catchAsync(async (req, res) => {
	const files = (req.files ?? []) as TUploadedFile[];
	const result = await ProductServices.addImages(req.params.id, files);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product images uploaded successfully!',
		data: result
	});
});

const removeImage: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.removeImage(req.params.id, req.body.url);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product image removed successfully!',
		data: result
	});
});

const addVideos: RequestHandler = catchAsync(async (req, res) => {
	const files = (req.files ?? []) as TUploadedFile[];
	const result = await ProductServices.addVideos(req.params.id, files);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product videos uploaded successfully!',
		data: result
	});
});

const removeVideo: RequestHandler = catchAsync(async (req, res) => {
	const result = await ProductServices.removeVideo(req.params.id, req.body.url);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Product video removed successfully!',
		data: result
	});
});

const ProductControllers = {
	createProduct,
	getProducts,
	getProductBySlug,
	getProductById,
	updateProduct,
	deleteProduct,
	updateStock,
	addVariant,
	updateVariant,
	removeVariant,
	addImages,
	removeImage,
	addVideos,
	removeVideo
};

export default ProductControllers;
