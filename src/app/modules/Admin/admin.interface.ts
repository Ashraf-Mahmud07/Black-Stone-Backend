import { Model } from 'mongoose';
import { UserRole } from '../../interface/auth';

/** Persistence shape - stays inside the data-access layer. */
export type TAdmin = {
	_id?: string;
	name: string;
	email: string;
	password: string;
	role: string;
	phone?: string;
	isDeleted?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

/** Database agnostic DTO. */
export type TAdminProfile = {
	id: string;
	name: string;
	email: string;
	phone?: string;
	role: UserRole;
	createdAt?: Date;
	updatedAt?: Date;
};

export type TAdminCredentials = TAdminProfile & { password: string };

export interface AdminModel extends Model<TAdmin> {
	isAdminExists(id: string): Promise<TAdmin | null>;
	isPasswordMatched(plainPassword: string, hashedPassword: string): Promise<boolean>;
}
