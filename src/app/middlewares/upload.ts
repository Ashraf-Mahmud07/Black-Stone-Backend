import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import multer from 'multer';
import config from '../config';
import AppError from '../errors/AppError';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const buildFilter = (allowed: string[], message: string): multer.Options['fileFilter'] => {
	return (req, file, cb) => {
		if (!allowed.includes(file.mimetype)) {
			cb(new AppError(httpStatus.BAD_REQUEST, message));
			return;
		}
		cb(null, true);
	};
};

// files are kept in memory and handed to the storage provider, keeping the
// business layer independent from where the file finally lives.
const imageUploader = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.storage.max_file_size_mb * 1024 * 1024 },
	fileFilter: buildFilter(ALLOWED_IMAGE_TYPES, 'Only JPEG, PNG and WEBP images are allowed!')
});

const videoUploader = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.storage.max_video_size_mb * 1024 * 1024 },
	fileFilter: buildFilter(ALLOWED_VIDEO_TYPES, 'Only MP4, WEBM and MOV videos are allowed!')
});

type TMulterHandler = ReturnType<typeof imageUploader.single>;

const wrap = (handler: TMulterHandler, maxSizeMb: number) => {
	return (req: Request, res: Response, next: NextFunction) => {
		handler(req, res, (error: unknown) => {
			if (error instanceof multer.MulterError) {
				const message =
					error.code === 'LIMIT_FILE_SIZE'
						? `File is too large! Maximum allowed size is ${maxSizeMb}MB.`
						: error.message;
				return next(new AppError(httpStatus.BAD_REQUEST, message));
			}
			if (error) return next(error);
			next();
		});
	};
};

export const uploadSingleImage = (field: string) => wrap(imageUploader.single(field), config.storage.max_file_size_mb);

export const uploadMultipleImages = (field: string, maxCount = 8) =>
	wrap(imageUploader.array(field, maxCount), config.storage.max_file_size_mb);

export const uploadMultipleVideos = (field: string, maxCount = 3) =>
	wrap(videoUploader.array(field, maxCount), config.storage.max_video_size_mb);

export default imageUploader;
