/* eslint-disable no-unused-vars */

/**
 * The storefront offers exactly these two areas. The value is the canonical API contract;
 * legacy spellings (`inside-dhaka`, `Inside Dhaka`) are normalised into it on the way in.
 */
export enum DeliveryArea {
	InsideDhaka = 'INSIDE_DHAKA',
	OutsideDhaka = 'OUTSIDE_DHAKA'
}

export type TDeliveryArea = {
	/** Canonical area key, e.g. `INSIDE_DHAKA`. */
	key: string;
	name: string;
	charge: number;
	estimatedDays?: string;
	isActive: boolean;
};

export type TDeliverySetting = {
	id?: string;
	defaultCharge: number;
	freeDeliveryEnabled: boolean;
	freeDeliveryThreshold: number;
	areas: TDeliveryArea[];
	note?: string;
	updatedAt?: Date;
};

export type TUpdateDeliverySettingPayload = Partial<Omit<TDeliverySetting, 'id' | 'updatedAt'>>;
