import bcrypt from 'bcryptjs';
import { model, Schema } from 'mongoose';
import config from '../../config';
import { UserRole } from '../../interface/auth';
import { Status, TAddress, TPicture, TUser, UserModel } from './user.interfaces';

const PictureSchema = new Schema<TPicture>(
	{
		url: {
			type: String,
			required: [true, 'Picture URL is required!']
		},
		publicId: {
			type: String,
			required: [true, 'Picture public ID is required!']
		}
	},
	{ _id: false }
);

const AddressSchema = new Schema<TAddress>(
	{
		label: { type: String },
		name: { type: String },
		phone: { type: String },
		address: { type: String, required: [true, 'Address is required!'] },
		deliveryNotes: { type: String },
		isDefault: { type: Boolean, default: false }
	},
	{ _id: false }
);

const userSchema = new Schema<TUser, UserModel>(
	{
		username: {
			type: String
		},
		name: {
			type: String,
			required: [true, 'Name is required!']
		},
		email: {
			type: String,
			required: [true, 'Email is required!'],
			unique: true,
			lowercase: true,
			trim: true
		},
		phone: {
			type: String,
			index: true
		},
		password: {
			type: String,
			required: [true, 'Password is required!'],
			select: false
		},
		role: {
			type: String,
			enum: Object.values(UserRole),
			default: UserRole.Customer
		},
		isVerified: {
			type: Boolean,
			default: false
		},
		location: {
			type: String
		},
		picture: PictureSchema,
		addresses: {
			type: [AddressSchema],
			default: []
		},
		favorites: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
		status: {
			type: String,
			enum: Object.values(Status),
			default: Status.Active
		},
		tokenVersion: {
			type: Number,
			default: 0
		},
		isDeleted: {
			type: Boolean,
			default: false
		}
	},
	{ timestamps: true }
);

userSchema.index({ createdAt: -1 });

// Pre-save hook for hashing the password
userSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_round) || 10);
	}
	next();
});

// Static methods
userSchema.statics.isUserExists = async function (id: string) {
	return this.findById(id).select('+password');
};

userSchema.statics.isPasswordMatched = async function (plainPassword: string, hashedPassword: string) {
	return bcrypt.compare(plainPassword, hashedPassword);
};

userSchema.statics.findUserByEmail = async function (email: string) {
	return this.findOne({ email }).select('+password');
};

export const User = model<TUser, UserModel>('User', userSchema);
