import { beforeEach, describe, expect, it, vi } from 'vitest';

type TUploadCallback = (error: unknown, result?: Record<string, unknown>) => void;

const cloudinaryMock = vi.hoisted(() => ({
	config: vi.fn(),
	uploader: {
		upload_stream: vi.fn((options: Record<string, unknown>, callback: TUploadCallback) => ({
			end: () =>
				callback(null, {
					public_id: `${options.folder}/generated-id`,
					secure_url: `https://res.cloudinary.com/demo/${options.resource_type}/${options.type}/generated-id`,
					bytes: 2048,
					width: 1200,
					height: 1600,
					duration: options.resource_type === 'video' ? 12.4 : undefined
				})
		})),
		destroy: vi.fn(async () => ({ result: 'ok' }))
	},
	url: vi.fn(
		(publicId: string, options: Record<string, unknown>) =>
			`https://res.cloudinary.com/demo/${options.resource_type}/${options.type}/${options.sign_url ? 's--sig--/' : ''}${publicId}`
	)
}));

vi.mock('cloudinary', () => ({ v2: cloudinaryMock }));

const file = {
	buffer: Buffer.from('fake-bytes'),
	originalname: 'receipt.png',
	mimetype: 'image/png',
	size: 2048
};

/** Builds the provider with credentials in place, bypassing the cached config module. */
const buildProvider = async () => {
	vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo-cloud');
	vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
	vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
	vi.stubEnv('CLOUDINARY_FOLDER', 'black-stone');
	vi.resetModules();

	const { createStorageProvider } = await import('../app/utils/storage');
	return createStorageProvider();
};

describe('CloudinaryStorageProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	it('uploads public product images under the configured base folder', async () => {
		const provider = await buildProvider();
		const stored = await provider.save(file, { folder: 'products', resourceType: 'image' });

		const [options] = cloudinaryMock.uploader.upload_stream.mock.calls[0];
		expect(options).toMatchObject({
			folder: 'black-stone/products',
			resource_type: 'image',
			type: 'upload',
			overwrite: false
		});

		expect(stored.key).toBe('upload:image:black-stone/products/generated-id');
		expect(stored.url).toContain('https://res.cloudinary.com');
		expect(stored.resourceType).toBe('image');
		expect(stored.width).toBe(1200);
	});

	it('uploads payment screenshots as private authenticated assets', async () => {
		const provider = await buildProvider();
		const stored = await provider.save(file, {
			folder: 'payments',
			resourceType: 'image',
			visibility: 'private'
		});

		const [options] = cloudinaryMock.uploader.upload_stream.mock.calls[0];
		expect(options).toMatchObject({ folder: 'black-stone/payments', type: 'authenticated' });
		expect(stored.key.startsWith('authenticated:image:')).toBe(true);
	});

	it('returns a poster frame and duration for videos', async () => {
		const provider = await buildProvider();
		const stored = await provider.save(
			{ ...file, originalname: 'clip.mp4', mimetype: 'video/mp4' },
			{
				folder: 'products',
				resourceType: 'video'
			}
		);

		const [options] = cloudinaryMock.uploader.upload_stream.mock.calls[0];
		expect(options.resource_type).toBe('video');
		expect(stored.resourceType).toBe('video');
		expect(stored.duration).toBe(12.4);
		expect(stored.thumbnailUrl).toContain('res.cloudinary.com');
	});

	it('signs the delivery url of a private asset and leaves public ones unsigned', async () => {
		const provider = await buildProvider();

		const privateUrl = await provider.locate('authenticated:image:black-stone/payments/receipt');
		expect(privateUrl).toContain('s--sig--');
		expect(cloudinaryMock.url).toHaveBeenCalledWith(
			'black-stone/payments/receipt',
			expect.objectContaining({ type: 'authenticated', sign_url: true, secure: true })
		);

		const publicUrl = await provider.locate('upload:image:black-stone/products/photo');
		expect(publicUrl).not.toContain('s--sig--');
		expect(cloudinaryMock.url).toHaveBeenLastCalledWith(
			'black-stone/products/photo',
			expect.objectContaining({ type: 'upload', sign_url: false })
		);
	});

	it('deletes assets with the delivery and resource type they were stored with', async () => {
		const provider = await buildProvider();
		await provider.remove('authenticated:image:black-stone/payments/receipt');

		expect(cloudinaryMock.uploader.destroy).toHaveBeenCalledWith('black-stone/payments/receipt', {
			resource_type: 'image',
			type: 'authenticated',
			invalidate: true
		});

		await provider.remove('upload:video:black-stone/products/clip');
		expect(cloudinaryMock.uploader.destroy).toHaveBeenLastCalledWith('black-stone/products/clip', {
			resource_type: 'video',
			type: 'upload',
			invalidate: true
		});
	});
});
