import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import { CUSTOMER_ROLE_ALIASES, TAuthUser, UserRole } from '../interface/auth';
import AdminRepository from '../modules/Admin/admin.repository';
import { Status } from '../modules/User/user.interfaces';
import UserRepository from '../modules/User/user.repository';
import catchAsync from '../utils/catchAsync';

const isCustomerRole = (role: string) => CUSTOMER_ROLE_ALIASES.includes(role);

const resolveAuthUser = async (decoded: JwtPayload): Promise<TAuthUser> => {
	const { id, email, role, tokenVersion } = decoded;

	if (isCustomerRole(role)) {
		const customer = await UserRepository.findById(id);
		if (!customer || customer.email !== email) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
		}
		if (customer.status !== Status.Active) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Your account is not active!');
		}
		// tokens issued before a logout / password change are rejected
		if (typeof tokenVersion === 'number' && tokenVersion !== customer.tokenVersion) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Session expired! Please login again.');
		}
		return {
			id: customer.id,
			name: customer.name,
			email: customer.email,
			role: UserRole.Customer,
			status: customer.status
		};
	}

	if (role === UserRole.Admin) {
		const admin = await AdminRepository.findById(id);
		if (!admin || admin.email !== email) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
		}
		return { id: admin.id, name: admin.name, email: admin.email, role: UserRole.Admin };
	}

	throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid role!');
};

const AuthGuard = (...requiredRoles: string[]) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const token = req.headers.authorization?.split(' ')[1];
		if (!token) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Authorization token is missing!');
		}

		let decoded: JwtPayload;
		try {
			decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
		} catch {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired token!');
		}

		const authUser = await resolveAuthUser(decoded);

		if (requiredRoles.length) {
			const allowed =
				authUser.role === UserRole.Customer
					? requiredRoles.some((role) => isCustomerRole(role))
					: requiredRoles.includes(authUser.role);

			if (!allowed) {
				throw new AppError(httpStatus.FORBIDDEN, 'Access denied!');
			}
		}

		req.user = authUser;
		req.userData = authUser;
		next();
	});
};

/**
 * Attaches the authenticated user when a valid token is present but never blocks the request.
 * Used by endpoints that support both guest and logged-in customers (checkout, reviews listing).
 */
export const OptionalAuth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization?.split(' ')[1];
	if (!token) return next();

	try {
		const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
		const authUser = await resolveAuthUser(decoded);
		req.user = authUser;
		req.userData = authUser;
	} catch {
		// an invalid token is simply ignored - the request continues as a guest
	}
	next();
});

export default AuthGuard;
