import { roundMoney } from '../../utils/pricing';
import { DeliveryArea, TDeliverySetting } from './delivery.interfaces';

export type TDeliveryResolution = {
	deliveryCharge: number;
	areaKey?: string;
	areaName?: string;
	isFreeDelivery: boolean;
};

/**
 * Folds any spelling of an area onto one comparable form, so `inside-dhaka`,
 * `Inside Dhaka` and `INSIDE_DHAKA` all match. Used for both stored settings keys and
 * incoming request values.
 */
const canonicalise = (value: string): string =>
	value
		.trim()
		.toUpperCase()
		.replace(/[\s-]+/g, '_');

/**
 * Normalises a client supplied area onto the two supported values.
 * Returns undefined for anything else, so the caller can reject it.
 */
export const normalizeDeliveryArea = (value?: unknown): DeliveryArea | undefined => {
	if (typeof value !== 'string' || !value.trim()) return undefined;
	const canonical = canonicalise(value);
	return Object.values(DeliveryArea).find((area) => area === canonical);
};

/**
 * Pure function so delivery pricing is never hardcoded in a controller and stays testable.
 * The free delivery threshold is evaluated against the items total (after item discounts).
 */
export const resolveDeliveryCharge = (
	setting: TDeliverySetting,
	itemsTotal: number,
	areaKey?: string
): TDeliveryResolution => {
	const area = areaKey
		? setting.areas.find((item) => canonicalise(item.key) === canonicalise(areaKey) && item.isActive)
		: undefined;

	if (areaKey && !area) {
		// unknown area falls back to the default charge instead of failing the checkout
		return applyFreeDelivery(setting, itemsTotal, { deliveryCharge: setting.defaultCharge, isFreeDelivery: false });
	}

	return applyFreeDelivery(setting, itemsTotal, {
		// the canonical key is returned, so an order always stores `INSIDE_DHAKA` / `OUTSIDE_DHAKA`
		deliveryCharge: area ? area.charge : setting.defaultCharge,
		areaKey: area ? canonicalise(area.key) : undefined,
		areaName: area?.name,
		isFreeDelivery: false
	});
};

const applyFreeDelivery = (
	setting: TDeliverySetting,
	itemsTotal: number,
	resolution: TDeliveryResolution
): TDeliveryResolution => {
	if (setting.freeDeliveryEnabled && setting.freeDeliveryThreshold > 0 && itemsTotal >= setting.freeDeliveryThreshold) {
		return { ...resolution, deliveryCharge: 0, isFreeDelivery: true };
	}
	return { ...resolution, deliveryCharge: roundMoney(resolution.deliveryCharge) };
};
