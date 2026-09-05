import { isValidId } from '../../DB/dbHelpers';
import { UserRole } from '../../interface/auth';
import { TAdmin, TAdminCredentials, TAdminProfile } from './admin.interface';
import { Admin } from './admin.model';

const toAdminProfile = (doc: TAdmin & { _id?: unknown }): TAdminProfile => ({
	id: String(doc._id),
	name: doc.name,
	email: doc.email,
	phone: doc.phone,
	role: UserRole.Admin,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt
});

const findById = async (id: string): Promise<TAdminProfile | null> => {
	if (!isValidId(id)) return null;
	const found = await Admin.findById(id).lean();
	return found ? toAdminProfile(found as TAdmin) : null;
};

const findCredentialsByEmail = async (email: string): Promise<TAdminCredentials | null> => {
	const found = await Admin.findOne({ email: email.toLowerCase() }).select('+password').lean();
	return found ? { ...toAdminProfile(found as TAdmin), password: (found as TAdmin).password } : null;
};

const AdminRepository = {
	findById,
	findCredentialsByEmail
};

export default AdminRepository;
