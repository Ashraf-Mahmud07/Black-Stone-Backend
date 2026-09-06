import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';

export type TUploadedFile = {
	buffer: Buffer;
	originalname: string;
	mimetype: string;
	size: number;
};

export type TStorageResourceType = 'image' | 'video' | 'raw';

/** `private` assets are never publicly reachable and are read through a signed url. */
export type TStorageVisibility = 'public' | 'private';

export type TStoredFile = {
	/** Provider specific handle stored in the database. Only the provider parses it. */
	key: string;
	url: string;
	mimetype: string;
	size: number;
	resourceType: TStorageResourceType;
	/** Poster frame for videos. */
	thumbnailUrl?: string;
	width?: number;
	height?: number;
	duration?: number;
};

export type TSaveOptions = {
	folder: string;
	resourceType?: TStorageResourceType;
	visibility?: TStorageVisibility;
};

/**
 * All uploads (product images, product videos, payment screenshots) go to Cloudinary.
 * The interface keeps services and controllers unaware of the provider, so another
 * hosted provider can replace this file without touching business logic.
 */
export interface IStorageProvider {
	readonly name: string;
	save(file: TUploadedFile, options: TSaveOptions): Promise<TStoredFile>;
	remove(key: string): Promise<void>;
	/** Delivery url for a stored file - signed when the asset is private. */
	locate(key: string): Promise<string>;
}

/** Maps a mime type onto the storage resource type. Exported for tests. */
export const resolveResourceType = (mimetype: string): TStorageResourceType => {
	if (mimetype.startsWith('image/')) return 'image';
	if (mimetype.startsWith('video/')) return 'video';
	return 'raw';
};

const sanitizeFolder = (folder: string): string => folder.replace(/[^a-zA-Z0-9/_-]/g, '');

type TCloudinaryKey = {
	deliveryType: 'upload' | 'authenticated';
	resourceType: TStorageResourceType;
	publicId: string;
};

/**
 * Cloudinary needs the delivery type and resource type to address an asset, so all three
 * parts are encoded into the single key that the database stores.
 * Format: `<deliveryType>:<resourceType>:<publicId>`
 */
export const encodeCloudinaryKey = (key: TCloudinaryKey): string =>
	`${key.deliveryType}:${key.resourceType}:${key.publicId}`;

export const decodeCloudinaryKey = (key: string): TCloudinaryKey => {
	const [deliveryType, resourceType, ...rest] = key.split(':');
	const publicId = rest.join(':');

	// tolerate keys that were written before this format existed
	if (!publicId || !['upload', 'authenticated'].includes(deliveryType)) {
		return { deliveryType: 'upload', resourceType: 'image', publicId: key };
	}

	return {
		deliveryType: deliveryType as TCloudinaryKey['deliveryType'],
		resourceType: (['image', 'video', 'raw'].includes(resourceType) ? resourceType : 'image') as TStorageResourceType,
		publicId
	};
};

class CloudinaryStorageProvider implements IStorageProvider {
	readonly name = 'cloudinary';

	private readonly baseFolder: string;

	constructor() {
		const { cloud_name, api_key, api_secret, folder } = config.cloudinary;
		if (!cloud_name || !api_key || !api_secret) {
			throw new Error(
				'Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
			);
		}

		cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
		this.baseFolder = sanitizeFolder(folder);
	}

	async save(file: TUploadedFile, options: TSaveOptions): Promise<TStoredFile> {
		const resourceType = options.resourceType ?? resolveResourceType(file.mimetype);
		const deliveryType = options.visibility === 'private' ? 'authenticated' : 'upload';

		const uploadOptions: UploadApiOptions = {
			folder: `${this.baseFolder}/${sanitizeFolder(options.folder)}`,
			resource_type: resourceType,
			// `authenticated` assets can only be delivered through a signed url
			type: deliveryType,
			unique_filename: true,
			overwrite: false
		};

		const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
				if (error || !result) {
					reject(new AppError(httpStatus.BAD_GATEWAY, error?.message || 'File upload to Cloudinary failed!'));
					return;
				}
				resolve(result);
			});
			stream.end(file.buffer);
		});

		return {
			key: encodeCloudinaryKey({ deliveryType, resourceType, publicId: uploaded.public_id }),
			url: uploaded.secure_url,
			mimetype: file.mimetype,
			size: uploaded.bytes ?? file.size,
			resourceType,
			thumbnailUrl:
				resourceType === 'video'
					? cloudinary.url(uploaded.public_id, {
							resource_type: 'video',
							type: deliveryType,
							format: 'jpg',
							secure: true,
							sign_url: deliveryType === 'authenticated'
						})
					: undefined,
			width: uploaded.width,
			height: uploaded.height,
			duration: uploaded.duration
		};
	}

	async remove(key: string): Promise<void> {
		const { deliveryType, resourceType, publicId } = decodeCloudinaryKey(key);
		await cloudinary.uploader.destroy(publicId, {
			resource_type: resourceType,
			type: deliveryType,
			invalidate: true
		});
	}

	async locate(key: string): Promise<string> {
		const { deliveryType, resourceType, publicId } = decodeCloudinaryKey(key);

		return cloudinary.url(publicId, {
			resource_type: resourceType,
			type: deliveryType,
			secure: true,
			// private assets are only delivered through a signed url
			sign_url: deliveryType === 'authenticated'
		});
	}
}

/** Exposed for tests; the application uses the shared `storage` instance below. */
export const createStorageProvider = (): IStorageProvider => new CloudinaryStorageProvider();

let provider: IStorageProvider | null = null;

/**
 * The provider is created on first use rather than at import time. On a serverless platform
 * an import time failure would take down every route, so a missing credential surfaces as a
 * clear error on the upload endpoints instead, leaving the rest of the API working.
 */
const getProvider = (): IStorageProvider => {
	if (!provider) provider = createStorageProvider();
	return provider;
};

// the methods are async so a missing credential rejects the promise instead of throwing
// synchronously - callers like `storage.remove(key).catch(...)` rely on that.
export const storage: IStorageProvider = {
	get name() {
		return getProvider().name;
	},
	save: async (file, options) => getProvider().save(file, options),
	remove: async (key) => getProvider().remove(key),
	locate: async (key) => getProvider().locate(key)
};

export const StorageFolders = {
	products: 'products',
	categories: 'categories',
	payments: 'payments'
} as const;
