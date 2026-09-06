import { describe, expect, it, vi } from 'vitest';

const cloudinaryMock = vi.hoisted(() => ({
	config: vi.fn(),
	uploader: { upload_stream: vi.fn(), destroy: vi.fn() },
	url: vi.fn(() => 'https://res.cloudinary.com/demo/signed-url')
}));

vi.mock('cloudinary', () => ({ v2: cloudinaryMock }));

import {
	createStorageProvider,
	decodeCloudinaryKey,
	encodeCloudinaryKey,
	resolveResourceType
} from '../app/utils/storage';

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
	it('builds the local provider by default', () => {
		expect(createStorageProvider('local').name).toBe('local');
	});

	it('rejects an unknown provider name', () => {
		expect(() => createStorageProvider('s3')).toThrowError(/Unknown STORAGE_PROVIDER/);
	});

	it('refuses to build the cloudinary provider without credentials', () => {
		expect(() => createStorageProvider('cloudinary')).toThrowError(/CLOUDINARY_CLOUD_NAME/);
	});
});
