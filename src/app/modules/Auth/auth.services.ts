import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import config from '../../config';
import AppError from '../../errors/AppError';
import { CUSTOMER_ROLE_ALIASES, TJwtPayload, UserRole } from '../../interface/auth';
import { createToken, verifyToken } from '../../utils/createToken';
import AdminRepository from '../Admin/admin.repository';
import { Status } from '../User/user.interfaces';
import UserRepository from '../User/user.repository';
import { TAuthResponse, TChangePasswordPayload, TLoginPayload, TRegisterPayload } from './auth.interfaces';

const issueTokens = (payload: TJwtPayload) => ({
	accessToken: createToken(payload, config.jwt_secret, config.jwt_expiration),
	refreshToken: createToken(payload, config.jwt_refresh_secret, config.jwt_refresh_expiration)
});

const hashPassword = (plainPassword: string) => bcrypt.hash(plainPassword, Number(config.bcrypt_salt_round) || 10);

const register = async (payload: TRegisterPayload): Promise<TAuthResponse> => {
	const existing = await UserRepository.findByEmail(payload.email);
	if (existing) {
		throw new AppError(httpStatus.CONFLICT, 'An account with this email already exists!');
	}

	const user = await UserRepository.create({ ...payload, role: UserRole.Customer });
	const tokens = issueTokens({
		id: user.id,
		email: user.email,
		role: UserRole.Customer,
		tokenVersion: user.tokenVersion
	});

	return { ...tokens, user };
};

const login = async (payload: TLoginPayload): Promise<TAuthResponse> => {
	const credentials = await UserRepository.findCredentialsByEmail(payload.email);
	if (!credentials) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password!');
	}

	const isPasswordMatched = await bcrypt.compare(payload.password, credentials.password);
	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password!');
	}

	if (credentials.status !== Status.Active) {
		throw new AppError(httpStatus.FORBIDDEN, 'Your account is not active! Please contact support.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password, ...user } = credentials;
	const tokens = issueTokens({
		id: user.id,
		email: user.email,
		role: UserRole.Customer,
		tokenVersion: user.tokenVersion
	});

	return { ...tokens, user };
};

const loginAdmin = async (payload: TLoginPayload): Promise<TAuthResponse> => {
	const credentials = await AdminRepository.findCredentialsByEmail(payload.email);
	if (!credentials) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password!');
	}

	const isPasswordMatched = await bcrypt.compare(payload.password, credentials.password);
	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid email or password!');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password, ...admin } = credentials;
	const tokens = issueTokens({ id: admin.id, email: admin.email, role: UserRole.Admin });

	return { ...tokens, user: admin };
};

const refreshToken = async (token: string) => {
	if (!token) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Refresh token is missing!');
	}

	const decoded = verifyToken(token, config.jwt_refresh_secret);
	const { id, email, role } = decoded as TJwtPayload;

	if (CUSTOMER_ROLE_ALIASES.includes(role)) {
		const user = await UserRepository.findById(id);
		if (!user || user.email !== email) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
		}
		if (user.status !== Status.Active) {
			throw new AppError(httpStatus.FORBIDDEN, 'Your account is not active!');
		}
		if (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== user.tokenVersion) {
			throw new AppError(httpStatus.UNAUTHORIZED, 'Session expired! Please login again.');
		}
		return {
			accessToken: createToken(
				{ id: user.id, email: user.email, role: UserRole.Customer, tokenVersion: user.tokenVersion },
				config.jwt_secret,
				config.jwt_expiration
			)
		};
	}

	const admin = await AdminRepository.findById(id);
	if (!admin || admin.email !== email) {
		throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
	}

	return {
		accessToken: createToken(
			{ id: admin.id, email: admin.email, role: UserRole.Admin },
			config.jwt_secret,
			config.jwt_expiration
		)
	};
};

const getMe = async (userId: string, role: UserRole) => {
	const profile =
		role === UserRole.Admin ? await AdminRepository.findById(userId) : await UserRepository.findById(userId);
	if (!profile) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
	}
	return profile;
};

const changePassword = async (userId: string, payload: TChangePasswordPayload) => {
	const credentials = await UserRepository.findCredentialsById(userId);
	if (!credentials) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
	}

	const isPasswordMatched = await bcrypt.compare(payload.oldPassword, credentials.password);
	if (!isPasswordMatched) {
		throw new AppError(httpStatus.FORBIDDEN, 'Current password is incorrect!');
	}

	await UserRepository.updatePassword(userId, await hashPassword(payload.newPassword));
	return { message: 'Password changed successfully! Please login again.' };
};

/**
 * Token invalidation strategy: every customer document holds a `tokenVersion` which is
 * embedded in issued tokens. Bumping it makes all previously issued tokens unusable.
 */
const logout = async (userId: string, role: UserRole) => {
	if (role === UserRole.Customer) {
		await UserRepository.incrementTokenVersion(userId);
	}
	return { message: 'Logged out successfully!' };
};

const AuthServices = {
	register,
	login,
	loginAdmin,
	refreshToken,
	getMe,
	changePassword,
	logout
};

export default AuthServices;
