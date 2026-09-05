import bcrypt from 'bcryptjs';
import { Schema, model } from 'mongoose';
import config from '../../config';
import { UserRole } from '../../interface/auth';
import { AdminModel, TAdmin } from './admin.interface';

const adminSchema = new Schema<TAdmin, AdminModel>(
	{
		name: {
			type: String
		},
		email: {
			type: String,
			required: [true, 'Email is required'],
			unique: true,
			lowercase: true,
			trim: true
		},
		phone: {
			type: String
		},
		role: {
			type: String,
			default: UserRole.Admin
		},
		password: {
			type: String,
			required: [true, 'Password is required'],
			select: false
		}
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true
		}
	}
);

//! pre save middleware/hook || hashing password
adminSchema.pre('save', async function (next) {
	// eslint-disable-next-line @typescript-eslint/no-this-alias
	const admin = this;
	admin.password = await bcrypt.hash(admin.password, Number(config.bcrypt_salt_round) || 10);
	next();
});

//checking if user is already exist!
adminSchema.statics.isAdminExists = async function (id) {
	const existingAdmin = await Admin.findById(id).select('+password');
	return existingAdmin;
};

adminSchema.statics.isPasswordMatched = async function (plainPassword: string, hashedPassword: string) {
	return await bcrypt.compare(plainPassword, hashedPassword);
};

export const Admin = model<TAdmin, AdminModel>('Admin', adminSchema);
