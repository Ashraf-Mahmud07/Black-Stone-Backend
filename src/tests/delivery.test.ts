import { describe, expect, it } from 'vitest';
import { TDeliverySetting } from '../app/modules/Delivery/delivery.interfaces';
import { resolveDeliveryCharge } from '../app/modules/Delivery/delivery.utils';

const setting: TDeliverySetting = {
	defaultCharge: 130,
	freeDeliveryEnabled: false,
	freeDeliveryThreshold: 3000,
	areas: [
		{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 60, isActive: true },
		{ key: 'outside-dhaka', name: 'Outside Dhaka', charge: 130, isActive: true },
		{ key: 'paused-area', name: 'Paused Area', charge: 40, isActive: false }
	]
};

describe('resolveDeliveryCharge', () => {
	it('uses the default charge when no area is given', () => {
		expect(resolveDeliveryCharge(setting, 1000).deliveryCharge).toBe(130);
	});

	it('uses the configured area charge', () => {
		const result = resolveDeliveryCharge(setting, 1000, 'inside-dhaka');
		expect(result.deliveryCharge).toBe(60);
		expect(result.areaName).toBe('Inside Dhaka');
	});

	it('falls back to the default charge for unknown or inactive areas', () => {
		expect(resolveDeliveryCharge(setting, 1000, 'mars').deliveryCharge).toBe(130);
		expect(resolveDeliveryCharge(setting, 1000, 'paused-area').deliveryCharge).toBe(130);
	});

	it('applies free delivery only when it is enabled and the threshold is reached', () => {
		const freeEnabled = { ...setting, freeDeliveryEnabled: true };

		expect(resolveDeliveryCharge(freeEnabled, 2999, 'inside-dhaka').deliveryCharge).toBe(60);

		const free = resolveDeliveryCharge(freeEnabled, 3000, 'inside-dhaka');
		expect(free.deliveryCharge).toBe(0);
		expect(free.isFreeDelivery).toBe(true);

		expect(resolveDeliveryCharge(setting, 5000, 'inside-dhaka').deliveryCharge).toBe(60);
	});
});
