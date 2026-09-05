import { Types } from 'mongoose';

/**
 * Database specific helpers. Only repositories are allowed to import this file so the
 * rest of the application stays free of persistence details.
 */
export const isValidId = (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id);

export const toObjectId = (id: string) => new Types.ObjectId(id);

export const buildSort = (sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, 1 | -1> => ({
	[sortBy]: sortOrder === 'asc' ? 1 : -1
});

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
