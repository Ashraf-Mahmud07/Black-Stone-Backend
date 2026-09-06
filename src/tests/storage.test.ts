import { describe, expect, it, vi } from 'vitest';

const cloudinaryMock = vi.hoisted(() => ({
	config: vi.fn(),
	uploader: { upload_stream: vi.fn(), destroy: vi.fn() },
	url: vi.fn(() => 'https://res.cloudinary.com/demo/signed-url')
}));

vi.mock('cloudinary', () => ({ v2: cloudinaryMock }));

import { decodeCloudinaryKey, encodeCloudinaryKey, resolveResourceType } from '../app/utils/storage';

describe('resolveResourceType', () => {
	it('maps mime types onto storage resource types', () => {
		expect(resolveResourceType('image/png')).toBe('image');
		expect(resolveResourceType('image/webp')).toBe('image');
		expect(resolveResourceType('video/mp4')).toBe('video');
		expect(resolveResourceType('video/quicktime')).toBe('video');
		expect(resolveResourceType('application/pdf')).toBe('raw');
	});
});

describe('cloudinary keys', () => {
	it('round trips delivery type, resource type and public id', () => {
		const key = encodeCloudinaryKey({
			deliveryType: 'authenticated',
			resourceType: 'image',
			publicId: 'black-stone/payments/receipt-123'
		});

		expect(key).toBe('authenticated:image:black-stone/payments/receipt-123');
		expect(decodeCloudinaryKey(key)).toEqual({
			deliveryType: 'authenticated',
			resourceType: 'image',
			publicId: 'black-stone/payments/receipt-123'
		});
	});

	it('keeps public ids that contain a colon intact', () => {
		const key = encodeCloudinaryKey({ deliveryType: 'upload', resourceType: 'video', publicId: 'folder/a:b' });
		expect(decodeCloudinaryKey(key).publicId).toBe('folder/a:b');
	});

	it('falls back to sane defaults for keys written by another provider', () => {
		expect(decodeCloudinaryKey('products/1712345678-ab12cd34.png')).toEqual({
			deliveryType: 'upload',
			resourceType: 'image',
			publicId: 'products/1712345678-ab12cd34.png'
		});
	});
});

describe('createStorageProvider', () => {
	it('refuses to start without Cloudinary credentials', async () => {
		vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
		vi.stubEnv('CLOUDINARY_API_KEY', '');
		vi.stubEnv('CLOUDINARY_API_SECRET', '');
		vi.resetModules();

		await expect(import('../app/utils/storage')).rejects.toThrowError(/CLOUDINARY_CLOUD_NAME/);
		vi.unstubAllEnvs();
	});
});
