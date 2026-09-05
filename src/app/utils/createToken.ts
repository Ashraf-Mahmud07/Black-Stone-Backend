import httpStatus from 'http-status';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import AppError from '../errors/AppError';
import { TJwtPayload } from '../interface/auth';

export const createToken = (jwtPayload: TJwtPayload, secret: string | Buffer, expiresIn: number) => {
	const options: SignOptions = { expiresIn };
	return jwt.sign(jwtPayload, secret as Secret, options);
};

export const verifyToken = (token: string, secret: string | Buffer) => {
	try {
		return jwt.verify(token, secret as Secret) as JwtPayload;
	} catch {
		throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
	}
};
