import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard, { OptionalAuth } from '../../middlewares/AuthGuard';
import validateRequest from '../../middlewares/validateRequest';
import CategoryControllers from './category.controllers';
import CategoryValidations from './category.validations';

const router = express.Router();

// admin
router.post(
	'/',
	AuthGuard(UserRole.Admin),
	validateRequest(CategoryValidations.createCategoryValidation),
	CategoryControllers.createCategory
);

router.patch(
	'/:id',
	AuthGuard(UserRole.Admin),
	validateRequest(CategoryValidations.updateCategoryValidation),
	CategoryControllers.updateCategory
);

router.delete('/:id', AuthGuard(UserRole.Admin), CategoryControllers.deactivateCategory);

// public
router.get('/', OptionalAuth, CategoryControllers.getCategories);
router.get('/:slug', OptionalAuth, CategoryControllers.getCategoryBySlug);

const CategoryRoutes = router;

export default CategoryRoutes;
