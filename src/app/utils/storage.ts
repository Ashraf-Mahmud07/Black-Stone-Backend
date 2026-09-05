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

export type TStoredFile = {
	key: string;
	url: string;
	mimetype: string;
	size: number;
};

/**
 * Storage is intentionally abstracted so the provider (local disk today, S3/Cloudinary later)
 * can be swapped without touching any service or controller.
 */
export interface IStorageProvider {
	save(file: TUploadedFile, folder: string): Promise<TStoredFile>;
	remove(key: string): Promise<void>;
	/** Absolute path / signed url used to stream private files through an authorised route. */
	resolve(key: string): string;
}

const safeFileName = (originalName: string): string => {
	const ext = path
		.extname(originalName)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, '');
	return `${Date.now()}-${uniqueSuffix(8)}${ext || ''}`;
};

class LocalStorageProvider implements IStorageProvider {
	private readonly baseDir: string;

	constructor(baseDir: string) {
		this.baseDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
	}

	async save(file: TUploadedFile, folder: string): Promise<TStoredFile> {
		const normalizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
		const targetDir = path.join(this.baseDir, normalizedFolder);
		await fs.promises.mkdir(targetDir, { recursive: true });

		const fileName = safeFileName(file.originalname);
		const key = `${normalizedFolder}/${fileName}`;
		await fs.promises.writeFile(path.join(this.baseDir, key), file.buffer);

		return {
			key,
			url: `${config.storage.public_url}/${config.storage.local_dir}/${key}`,
			mimetype: file.mimetype,
			size: file.size
		};
	}

	async remove(key: string): Promise<void> {
		const target = this.resolve(key);
		await fs.promises.rm(target, { force: true });
	}

	resolve(key: string): string {
		const target = path.join(this.baseDir, key);
		// prevent path traversal through crafted keys
		if (!target.startsWith(this.baseDir)) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Invalid file key!');
		}
		return target;
	}
}

const createStorageProvider = (): IStorageProvider => {
	switch (config.storage.provider) {
		case 'local':
		default:
			return new LocalStorageProvider(config.storage.local_dir);
	}
};

export const storage: IStorageProvider = createStorageProvider();

export const StorageFolders = {
	products: 'products',
	categories: 'categories',
	payments: 'payments'
} as const;
