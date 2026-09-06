import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import httpStatus from 'http-status';
import path from 'path';
import config from '../config';
import AppError from '../errors/AppError';
import { uniqueSuffix } from './slugify';

export type TUploadedFile = {
	buffer: Buffer;
	originalname: string;
	mimetype: string;
	size: number;
};

export type TStorageResourceType = 'image' | 'video' | 'raw';

/** `private` assets are never publicly reachable and are read through an authorised route. */
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

export type TRemoveOptions = {
	resourceType?: TStorageResourceType;
	visibility?: TStorageVisibility;
};

/** Where a private file can be read from: a local path to stream, or a signed URL to redirect to. */
export type TFileLocation = { kind: 'path'; path: string } | { kind: 'url'; url: string };

/**
 * Storage is abstracted so the provider can be swapped without touching any service or
 * controller. `local` writes to disk (development), `cloudinary` is the hosted provider.
 */
export interface IStorageProvider {
	readonly name: string;
	save(file: TUploadedFile, options: TSaveOptions): Promise<TStoredFile>;
	remove(key: string, options?: TRemoveOptions): Promise<void>;
	locate(key: string, options?: TRemoveOptions): Promise<TFileLocation>;
}

/** Maps a mime type onto the storage resource type. Exported for tests. */
export const resolveResourceType = (mimetype: string): TStorageResourceType => {
	if (mimetype.startsWith('image/')) return 'image';
	if (mimetype.startsWith('video/')) return 'video';
	return 'raw';
};

const safeFileName = (originalName: string): string => {
	const ext = path
		.extname(originalName)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, '');
	return `${Date.now()}-${uniqueSuffix(8)}${ext || ''}`;
};

const sanitizeFolder = (folder: string): string => folder.replace(/[^a-zA-Z0-9/_-]/g, '');

// ---------------------------------------------------------------------------
// local disk
// ---------------------------------------------------------------------------

class LocalStorageProvider implements IStorageProvider {
	readonly name = 'local';

	private readonly baseDir: string;

	constructor(baseDir: string) {
		this.baseDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
	}

	async save(file: TUploadedFile, options: TSaveOptions): Promise<TStoredFile> {
		const folder = sanitizeFolder(options.folder);
		const targetDir = path.join(this.baseDir, folder);
		await fs.promises.mkdir(targetDir, { recursive: true });

		const key = `${folder}/${safeFileName(file.originalname)}`;
		await fs.promises.writeFile(path.join(this.baseDir, key), file.buffer);

		return {
			key,
			url: `${config.storage.public_url}/${config.storage.local_dir}/${key}`,
			mimetype: file.mimetype,
			size: file.size,
			resourceType: options.resourceType ?? resolveResourceType(file.mimetype)
		};
	}

	async remove(key: string): Promise<void> {
		const location = this.resolvePath(key);
		await fs.promises.rm(location, { force: true });
	}

	async locate(key: string): Promise<TFileLocation> {
		return { kind: 'path', path: this.resolvePath(key) };
	}

	private resolvePath(key: string): string {
		const target = path.join(this.baseDir, key);
		// prevent path traversal through crafted keys
		if (!target.startsWith(this.baseDir)) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Invalid file key!');
		}
		return target;
	}
}

// ---------------------------------------------------------------------------
// cloudinary
// ---------------------------------------------------------------------------

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

	// keys written by another provider (or older local keys) fall back to sane defaults
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

	async locate(key: string): Promise<TFileLocation> {
		const { deliveryType, resourceType, publicId } = decodeCloudinaryKey(key);

		return {
			kind: 'url',
			url: cloudinary.url(publicId, {
				resource_type: resourceType,
				type: deliveryType,
				secure: true,
				// private assets are only delivered through a signed url
				sign_url: deliveryType === 'authenticated'
			})
		};
	}
}

// ---------------------------------------------------------------------------
// provider selection
// ---------------------------------------------------------------------------

export const createStorageProvider = (provider = config.storage.provider): IStorageProvider => {
	switch (provider) {
		case 'cloudinary':
			return new CloudinaryStorageProvider();
		case 'local':
			return new LocalStorageProvider(config.storage.local_dir);
		default:
			throw new Error(`Unknown STORAGE_PROVIDER "${provider}". Supported providers: local, cloudinary.`);
	}
};

export const storage: IStorageProvider = createStorageProvider();

export const StorageFolders = {
	products: 'products',
	categories: 'categories',
	payments: 'payments'
} as const;
