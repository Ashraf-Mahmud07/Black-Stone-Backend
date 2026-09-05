import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import { strictLimiter } from '../../middlewares/rateLimiter';
import validateRequest from '../../middlewares/validateRequest';
import AuthControllers from './auth.controllers';
import AuthValidations from './auth.validations';

const router = express.Router();

router.post('/register', strictLimiter, validateRequest(AuthValidations.registerValidation), AuthControllers.register);

router.post('/login', strictLimiter, validateRequest(AuthValidations.loginValidation), AuthControllers.login);

router.post(
	'/admin/login',
	strictLimiter,
	validateRequest(AuthValidations.loginValidation),
	AuthControllers.loginAdmin
);

router.post('/refresh-token', validateRequest(AuthValidations.refreshTokenValidation), AuthControllers.refreshToken);

router.get('/me', AuthGuard(UserRole.Customer, UserRole.Admin), AuthControllers.getMe);

router.post(
	'/change-password',
	AuthGuard(UserRole.Customer),
	validateRequest(AuthValidations.changePasswordValidation),
	AuthControllers.changePassword
);

router.post('/logout', AuthGuard(UserRole.Customer, UserRole.Admin), AuthControllers.logout);

const AuthRoutes = router;

export default AuthRoutes;
