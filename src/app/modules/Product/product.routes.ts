import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard, { OptionalAuth } from '../../middlewares/AuthGuard';
import { uploadMultipleImages, uploadMultipleVideos } from '../../middlewares/upload';
import validateRequest from '../../middlewares/validateRequest';
import ProductControllers from './product.controllers';
import ProductValidations from './product.validations';

const router = express.Router();

// ---------------------------------------------------------------------------
// admin
// ---------------------------------------------------------------------------
router.post(
	'/',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.createProductValidation),
	ProductControllers.createProduct
);

router.patch(
	'/:id/stock',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.updateStockValidation),
	ProductControllers.updateStock
);

router.post(
	'/:id/variants',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.createVariantValidation),
	ProductControllers.addVariant
);

router.patch(
	'/:id/variants/:variantId',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.updateVariantValidation),
	ProductControllers.updateVariant
);

router.delete('/:id/variants/:variantId', AuthGuard(UserRole.Admin), ProductControllers.removeVariant);

router.post('/:id/images', AuthGuard(UserRole.Admin), uploadMultipleImages('images', 8), ProductControllers.addImages);

router.delete(
	'/:id/images',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.removeImageValidation),
	ProductControllers.removeImage
);

router.post('/:id/videos', AuthGuard(UserRole.Admin), uploadMultipleVideos('videos', 3), ProductControllers.addVideos);

router.delete(
	'/:id/videos',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.removeVideoValidation),
	ProductControllers.removeVideo
);

router.patch(
	'/:id',
	AuthGuard(UserRole.Admin),
	validateRequest(ProductValidations.updateProductValidation),
	ProductControllers.updateProduct
);

router.delete('/:id', AuthGuard(UserRole.Admin), ProductControllers.deleteProduct);

// ---------------------------------------------------------------------------
// public
// ---------------------------------------------------------------------------
router.get('/', OptionalAuth, ProductControllers.getProducts);
router.get('/id/:id', OptionalAuth, ProductControllers.getProductById);
router.get('/:slug', OptionalAuth, ProductControllers.getProductBySlug);

const ProductRoutes = router;

export default ProductRoutes;
