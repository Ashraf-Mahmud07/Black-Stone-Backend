import { Model, ObjectId } from 'mongoose';
import { UserRole } from '../../interface/auth';

export enum Status {
	Active = 'active',
	Blocked = 'blocked'
}

export type TPicture = {
	url: string;
	publicId: string;
};


export type TAddress = {
	label?: string;
	name?: string;
	phone?: string;
	addressLine: string;
	area?: string;
	city: string;
	district?: string;
	postalCode?: string;
	isDefault?: boolean;
};

/** Persistence shape (mongoose document fields). Never leaves the data-access layer. */
export interface TUser {
	_id?: string;
	username?: string;
	name: string;
	email: string;
	phone?: string;
	password: string;
	role?: UserRole;
	isVerified?: boolean;
	location?: string;
	picture?: TPicture;
	addresses?: TAddress[];
	favorites?: ObjectId[];
	status?: Status;
	tokenVersion?: number;
	isDeleted?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

/** Database agnostic DTO used by services, controllers and API responses. */
export type TUserProfile = {
	id: string;
	username?: string;
	name: string;
	email: string;
	phone?: string;
	role: UserRole;
	isVerified: boolean;
	location?: string;
	picture?: TPicture;
	addresses: TAddress[];
	status: Status;
	tokenVersion: number;
	isDeleted: boolean;
	createdAt?: Date;
	updatedAt?: Date;
};

/** Only used by the authentication service. */
export type TUserCredentials = TUserProfile & { password: string };

export type TCreateUserPayload = {
	name: string;
	email: string;
	password: string;
	username?: string;
	phone?: string;
	role?: UserRole;
	addresses?: TAddress[];
};

export type TUpdateUserPayload = Partial<Omit<TCreateUserPayload, 'password' | 'role'>> & {
	location?: string;
	picture?: TPicture;
};

export type TUserFilters = {
	search?: string;
	status?: Status;
};

export interface UserModel extends Model<TUser> {
	isUserExists(id: string): Promise<TUser | null>;
	isPasswordMatched(plainPassword: string, hashedPassword: string): Promise<boolean>;
	findUserByEmail(email: string): Promise<TUser | null>;
}
