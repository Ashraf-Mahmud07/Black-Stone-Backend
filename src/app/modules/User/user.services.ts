import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TPaginatedResult } from '../../interface/common';
import { calculatePagination } from '../../utils/pagination';
import { Status, TUpdateUserPayload, TUserFilters, TUserProfile } from './user.interfaces';
import UserRepository from './user.repository';

const changeUserStatus = async (id: string, status: string): Promise<TUserProfile> => {
	const isStatusValid = Object.values(Status).includes(status as Status);
	if (!isStatusValid) {
		throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user status!');
	}

	const updated = await UserRepository.updateStatus(id, status as Status);
	if (!updated) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
	}
	return updated;
};

const getUser = async (id: string): Promise<TUserProfile> => {
	const user = await UserRepository.findById(id);
	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
	}
	return user;
};

const getUsers = async (query: Record<string, unknown>): Promise<TPaginatedResult<TUserProfile>> => {
	const pagination = calculatePagination(query);
	const filters: TUserFilters = {
		search: typeof query.search === 'string' ? query.search : undefined,
		status: typeof query.status === 'string' ? (query.status as Status) : undefined
	};
	return UserRepository.findMany(filters, pagination);
};

const updateUser = async (id: string, payload: TUpdateUserPayload): Promise<TUserProfile> => {
	const updated = await UserRepository.update(id, payload);
	if (!updated) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
	}
	return updated;
};

const deleteUser = async (id: string): Promise<TUserProfile> => {
	const deleted = await UserRepository.softDelete(id);
	if (!deleted) {
		throw new AppError(httpStatus.NOT_FOUND, 'User not found or already deleted!');
	}
	return deleted;
};

const UserServices = {
	changeUserStatus,
	getUser,
	getUsers,
	updateUser,
	deleteUser
};

export default UserServices;
