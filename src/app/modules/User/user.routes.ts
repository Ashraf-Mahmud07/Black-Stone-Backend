import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import validateRequest from '../../middlewares/validateRequest';
import UserControllers from './user.controllers';
import UserValidations from './user.validations';

const router = express.Router();

router.patch(
	'/me',
	AuthGuard(UserRole.Customer),
	validateRequest(UserValidations.updateUserValidation),
	UserControllers.updateMyProfile
);

router.get('/', AuthGuard(UserRole.Admin), UserControllers.getUsers);

router.get('/:id', AuthGuard(UserRole.Admin, UserRole.Customer), UserControllers.getUser);

router.patch(
	'/:id/status',
	AuthGuard(UserRole.Admin),
	validateRequest(UserValidations.changeStatusValidation),
	UserControllers.changeUserStatus
);

router.delete('/:id', AuthGuard(UserRole.Admin), UserControllers.deleteUser);

const UserRoutes = router;

export default UserRoutes;
