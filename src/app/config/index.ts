import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const toNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && value !== undefined && value !== '' ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback = false): boolean => {
	if (value === undefined || value === '') return fallback;
	return value.toLowerCase() === 'true';
};

export default {
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	NODE_ENV: process.env.NODE_ENV,
	bcrypt_salt_round: process.env.BCRYPT_SALT_ROUND,
	jwt_secret: process.env.JWT_SECRET as string,
	jwt_expiration: toNumber(process.env.JWT_EXPIRATION, 86400),
	jwt_refresh_secret: (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string,
	jwt_refresh_expiration: toNumber(process.env.JWT_REFRESH_EXPIRATION, 2592000),
	super_admin_email: process.env.SUPER_ADMIN_EMAIL,
	super_admin_password: process.env.SUPER_ADMIN_PASSWORD,

	sender_email: process.env.SENDER_EMAIL as string,
	sender_email_password: process.env.SENDER_EMAIL_PASSWORD,

	// client / cors
	frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
	cors_origins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean),

	// upload limits (all files are stored on Cloudinary)
	storage: {
		max_file_size_mb: toNumber(process.env.MAX_UPLOAD_SIZE_MB, 5),
		max_video_size_mb: toNumber(process.env.MAX_VIDEO_UPLOAD_SIZE_MB, 50)
	},

	// cloudinary - the storage provider for every image and video
	cloudinary: {
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
		api_key: process.env.CLOUDINARY_API_KEY || '',
		api_secret: process.env.CLOUDINARY_API_SECRET || '',
		// every asset is created under this base folder
		folder: process.env.CLOUDINARY_FOLDER || 'black-stone'
	},

	// manual payment (bKash / Nagad) configuration
	payment: {
		// the store is cash on delivery only; flip this to re-open the wallet submission flow
		online_payments_enabled: toBoolean(process.env.ONLINE_PAYMENTS_ENABLED, false),
		bkash_merchant_number: process.env.BKASH_MERCHANT_NUMBER || '',
		bkash_account_type: process.env.BKASH_ACCOUNT_TYPE || 'personal',
		nagad_merchant_number: process.env.NAGAD_MERCHANT_NUMBER || '',
		nagad_account_type: process.env.NAGAD_ACCOUNT_TYPE || 'personal'
	},

	// commerce defaults (used when no DeliverySetting document exists yet)
	commerce: {
		default_delivery_charge: toNumber(process.env.DEFAULT_DELIVERY_CHARGE, 80),
		delivery_charge_inside_dhaka: toNumber(process.env.DELIVERY_CHARGE_INSIDE_DHAKA, 80),
		delivery_charge_outside_dhaka: toNumber(process.env.DELIVERY_CHARGE_OUTSIDE_DHAKA, 150),
		free_delivery_enabled: toBoolean(process.env.FREE_DELIVERY_ENABLED, false),
		free_delivery_threshold: toNumber(process.env.FREE_DELIVERY_THRESHOLD, 3000),
		low_stock_threshold: toNumber(process.env.LOW_STOCK_THRESHOLD, 5)
	},

	// API documentation (Swagger UI + OpenAPI JSON)
	swagger: {
		enabled: toBoolean(process.env.SWAGGER_ENABLED, true),
		path: process.env.SWAGGER_PATH || '/api-docs',
		server_url: (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, ''),
		staging_url: (process.env.API_STAGING_URL || '').replace(/\/$/, ''),
		production_url: (process.env.API_PRODUCTION_URL || '').replace(/\/$/, ''),
		// when both are set, the docs endpoints are protected with HTTP basic auth
		user: process.env.SWAGGER_USER || '',
		password: process.env.SWAGGER_PASSWORD || ''
	},

	seed_dev_data: toBoolean(process.env.SEED_DEV_DATA, false),
	seed_customer_email: process.env.SEED_CUSTOMER_EMAIL || 'customer@blackstone.test',
	seed_customer_password: process.env.SEED_CUSTOMER_PASSWORD || 'Customer1234'
};
