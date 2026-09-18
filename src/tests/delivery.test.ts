import { describe, expect, it } from 'vitest';
import { DeliveryArea, TDeliverySetting } from '../app/modules/Delivery/delivery.interfaces';
import { normalizeDeliveryArea, resolveDeliveryCharge } from '../app/modules/Delivery/delivery.utils';

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

describe('normalizeDeliveryArea', () => {
	it('accepts the canonical values', () => {
		expect(normalizeDeliveryArea('INSIDE_DHAKA')).toBe(DeliveryArea.InsideDhaka);
		expect(normalizeDeliveryArea('OUTSIDE_DHAKA')).toBe(DeliveryArea.OutsideDhaka);
	});

	it('folds legacy and human spellings onto the canonical value', () => {
		expect(normalizeDeliveryArea('inside-dhaka')).toBe(DeliveryArea.InsideDhaka);
		expect(normalizeDeliveryArea('Inside Dhaka')).toBe(DeliveryArea.InsideDhaka);
		expect(normalizeDeliveryArea('  outside-dhaka  ')).toBe(DeliveryArea.OutsideDhaka);
	});

	it('rejects anything else, so the caller can return a validation error', () => {
		expect(normalizeDeliveryArea('CHITTAGONG')).toBeUndefined();
		expect(normalizeDeliveryArea('')).toBeUndefined();
		expect(normalizeDeliveryArea(undefined)).toBeUndefined();
		expect(normalizeDeliveryArea(42)).toBeUndefined();
	});
});

describe('two area delivery charges', () => {
	const twoAreas: TDeliverySetting = {
		defaultCharge: 80,
		freeDeliveryEnabled: false,
		freeDeliveryThreshold: 0,
		areas: [
			{ key: DeliveryArea.InsideDhaka, name: 'Inside Dhaka', charge: 80, isActive: true },
			{ key: DeliveryArea.OutsideDhaka, name: 'Outside Dhaka', charge: 150, isActive: true }
		]
	};

	it('charges each area its configured rate', () => {
		expect(resolveDeliveryCharge(twoAreas, 1000, DeliveryArea.InsideDhaka).deliveryCharge).toBe(80);
		expect(resolveDeliveryCharge(twoAreas, 1000, DeliveryArea.OutsideDhaka).deliveryCharge).toBe(150);
	});

	it('returns the canonical key whatever spelling was asked for', () => {
		expect(resolveDeliveryCharge(twoAreas, 1000, 'inside-dhaka').areaKey).toBe(DeliveryArea.InsideDhaka);
	});

	it('still matches settings saved with the old lowercase keys', () => {
		const legacy: TDeliverySetting = {
			...twoAreas,
			areas: [{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 80, isActive: true }]
		};
		const result = resolveDeliveryCharge(legacy, 1000, DeliveryArea.InsideDhaka);
		expect(result.deliveryCharge).toBe(80);
		expect(result.areaKey).toBe(DeliveryArea.InsideDhaka);
	});
});
