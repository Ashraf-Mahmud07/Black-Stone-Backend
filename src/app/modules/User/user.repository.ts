import { FilterQuery } from 'mongoose';
import { buildSort, escapeRegex, isValidId } from '../../DB/dbHelpers';
import { UserRole } from '../../interface/auth';
import { TPaginatedResult, TPaginationOptions } from '../../interface/common';
import { buildMeta } from '../../utils/pagination';
import {
	Status,
	TCreateUserPayload,
	TUpdateUserPayload,
	TUser,
	TUserCredentials,
	TUserFilters,
	TUserProfile
} from './user.interfaces';
import { User } from './user.model';

const SEARCH_FIELDS = ['name', 'username', 'email', 'phone'];

export const toUserProfile = (doc: TUser & { _id?: unknown }): TUserProfile => ({
	id: String(doc._id),
	username: doc.username,
	name: doc.name,
	email: doc.email,
	phone: doc.phone,
	role: doc.role ?? UserRole.Customer,
	isVerified: doc.isVerified ?? false,
	location: doc.location,
	picture: doc.picture,
	addresses: doc.addresses ?? [],
	status: doc.status ?? Status.Active,
	tokenVersion: doc.tokenVersion ?? 0,
	isDeleted: doc.isDeleted ?? false,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const create = async (payload: TCreateUserPayload): Promise<TUserProfile> => {
	const created = await User.create(payload);
	return toUserProfile(created.toObject());
};

const findById = async (id: string): Promise<TUserProfile | null> => {
	if (!isValidId(id)) return null;
	const found = await User.findOne({ _id: id, isDeleted: false }).lean();
	return found ? toUserProfile(found as TUser) : null;
};

const findByEmail = async (email: string): Promise<TUserProfile | null> => {
	const found = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).lean();
	return found ? toUserProfile(found as TUser) : null;
};

/** Only the authentication service should use this. */
const findCredentialsByEmail = async (email: string): Promise<TUserCredentials | null> => {
	const found = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+password').lean();
	return found ? { ...toUserProfile(found as TUser), password: (found as TUser).password } : null;
};

const findCredentialsById = async (id: string): Promise<TUserCredentials | null> => {
	if (!isValidId(id)) return null;
	const found = await User.findOne({ _id: id, isDeleted: false }).select('+password').lean();
	return found ? { ...toUserProfile(found as TUser), password: (found as TUser).password } : null;
};

const findMany = async (
	filters: TUserFilters,
	pagination: TPaginationOptions
): Promise<TPaginatedResult<TUserProfile>> => {
	const query: FilterQuery<TUser> = { isDeleted: false, role: UserRole.Customer };

	if (filters.status) query.status = filters.status;
	if (filters.search) {
		const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
		query.$or = SEARCH_FIELDS.map((field) => ({ [field]: regex }));
	}

	const [rows, total] = await Promise.all([
		User.find(query)
			.sort(buildSort(pagination.sortBy, pagination.sortOrder))
			.skip(pagination.skip)
			.limit(pagination.limit)
			.lean(),
		User.countDocuments(query)
	]);

	return { data: rows.map((row) => toUserProfile(row as TUser)), meta: buildMeta(pagination, total) };
};

const update = async (id: string, payload: TUpdateUserPayload): Promise<TUserProfile | null> => {
	if (!isValidId(id)) return null;
	const updated = await User.findOneAndUpdate({ _id: id, isDeleted: false }, payload, { new: true }).lean();
	return updated ? toUserProfile(updated as TUser) : null;
};

const updateStatus = async (id: string, status: Status): Promise<TUserProfile | null> => {
	if (!isValidId(id)) return null;
	const updated = await User.findOneAndUpdate({ _id: id, isDeleted: false }, { status }, { new: true }).lean();
	return updated ? toUserProfile(updated as TUser) : null;
};

const updatePassword = async (id: string, hashedPassword: string): Promise<void> => {
	if (!isValidId(id)) return;
	await User.updateOne({ _id: id }, { password: hashedPassword, $inc: { tokenVersion: 1 } });
};

const incrementTokenVersion = async (id: string): Promise<void> => {
	if (!isValidId(id)) return;
	await User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
};

const softDelete = async (id: string): Promise<TUserProfile | null> => {
	if (!isValidId(id)) return null;
	const deleted = await User.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true }).lean();
	return deleted ? toUserProfile(deleted as TUser) : null;
};

const count = async (filters: TUserFilters = {}): Promise<number> => {
	const query: FilterQuery<TUser> = { isDeleted: false, role: UserRole.Customer };
	if (filters.status) query.status = filters.status;
	return User.countDocuments(query);
};

const UserRepository = {
	create,
	findById,
	findByEmail,
	findCredentialsByEmail,
	findCredentialsById,
	findMany,
	update,
	updateStatus,
	updatePassword,
	incrementTokenVersion,
	softDelete,
	count
};

export default UserRepository;
