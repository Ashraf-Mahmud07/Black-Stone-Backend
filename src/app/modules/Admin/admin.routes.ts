import express from 'express';
import { UserRole } from '../../interface/auth';
import AuthGuard from '../../middlewares/AuthGuard';
import { strictLimiter } from '../../middlewares/rateLimiter';
import validateRequest from '../../middlewares/validateRequest';
import AuthControllers from '../Auth/auth.controllers';
import AuthValidations from '../Auth/auth.validations';
import AdminControllers from './admin.controllers';

const router = express.Router();

// kept for backwards compatibility - /api/auth/admin/login is the canonical endpoint
router.post('/login', strictLimiter, validateRequest(AuthValidations.loginValidation), AuthControllers.loginAdmin);

router.get('/dashboard', AuthGuard(UserRole.Admin), AdminControllers.getDashboardStats);

const AdminRoutes = router;

export default AdminRoutes;
