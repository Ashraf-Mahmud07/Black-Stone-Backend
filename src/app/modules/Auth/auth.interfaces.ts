import { TAdminProfile } from '../Admin/admin.interface';
import { TUserProfile } from '../User/user.interfaces';

export type TLoginPayload = {
	email: string;
	password: string;
};

export type TRegisterPayload = {
	name: string;
	email: string;
	password: string;
	phone?: string;
	username?: string;
};

export type TChangePasswordPayload = {
	oldPassword: string;
	newPassword: string;
};

export type TAuthResponse = {
	accessToken: string;
	refreshToken: string;
	user: TUserProfile | TAdminProfile;
};
