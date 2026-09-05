import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import multer from 'multer';
import config from '../config';
import AppError from '../errors/AppError';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const limits = { fileSize: config.storage.max_file_size_mb * 1024 * 1024 };

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
	if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
		cb(new AppError(httpStatus.BAD_REQUEST, 'Only JPEG, PNG and WEBP images are allowed!'));
		return;
	}
	cb(null, true);
};

// files are kept in memory and handed to the storage provider, keeping the
// business layer independent from where the file finally lives.
const uploader = multer({ storage: multer.memoryStorage(), limits, fileFilter });

const wrap = (handler: ReturnType<typeof uploader.single>) => {
	return (req: Request, res: Response, next: NextFunction) => {
		handler(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError) {
				const message =
					error.code === 'LIMIT_FILE_SIZE'
						? `File is too large! Maximum allowed size is ${config.storage.max_file_size_mb}MB.`
						: error.message;
				return next(new AppError(httpStatus.BAD_REQUEST, message));
			}
			if (error) return next(error);
			next();
		});
	};
};

export const uploadSingleImage = (field: string) => wrap(uploader.single(field));

export const uploadMultipleImages = (field: string, maxCount = 8) => wrap(uploader.array(field, maxCount));

export default uploader;
