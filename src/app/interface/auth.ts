export enum UserRole {
	Customer = 'customer',
	Admin = 'admin'
}

/** Legacy tokens issued by the boilerplate used `user` instead of `customer`. */
export const CUSTOMER_ROLE_ALIASES = ['customer', 'user'];

export type TAuthUser = {
	id: string;
	name?: string;
	email: string;
	role: UserRole;
	status?: string;
};

export type TJwtPayload = {
	id: string;
	email: string;
	role: string;
	tokenVersion?: number;
};
