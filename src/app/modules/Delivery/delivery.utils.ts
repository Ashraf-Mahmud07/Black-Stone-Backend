import { roundMoney } from '../../utils/pricing';
import { TDeliverySetting } from './delivery.interfaces';

export type TDeliveryResolution = {
	deliveryCharge: number;
	areaKey?: string;
	areaName?: string;
	isFreeDelivery: boolean;
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
		? setting.areas.find((item) => item.key.toLowerCase() === areaKey.toLowerCase() && item.isActive)
		: undefined;

	if (areaKey && !area) {
		// unknown area falls back to the default charge instead of failing the checkout
		return applyFreeDelivery(setting, itemsTotal, { deliveryCharge: setting.defaultCharge, isFreeDelivery: false });
	}

	return applyFreeDelivery(setting, itemsTotal, {
		deliveryCharge: area ? area.charge : setting.defaultCharge,
		areaKey: area?.key,
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
