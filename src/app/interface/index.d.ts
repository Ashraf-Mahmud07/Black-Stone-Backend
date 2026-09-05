import { TAuthUser } from './auth';

declare global {
	namespace Express {
		interface Request {
			user: TAuthUser;
			userData?: TAuthUser;
		}
	}
}

export {};
