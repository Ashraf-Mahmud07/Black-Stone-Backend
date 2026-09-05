export type TDeliveryArea = {
	/** Frontend friendly key, e.g. `inside-dhaka`. */
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
