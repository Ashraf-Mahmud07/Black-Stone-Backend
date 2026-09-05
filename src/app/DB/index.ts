import config from '../config';
import { UserRole } from '../interface/auth';
import { Admin } from '../modules/Admin/admin.model';

const superAdmin = {
	name: 'Super Admin',
	email: config.super_admin_email,
	password: config.super_admin_password,
	role: UserRole.Admin
};

const seedSuperAdmin = async () => {
	if (!config.super_admin_email || !config.super_admin_password) return;

	const isSuperAdminExists = await Admin.findOne({ email: config.super_admin_email });
	if (!isSuperAdminExists) {
		await Admin.create(superAdmin);
	}
};

export default seedSuperAdmin;
