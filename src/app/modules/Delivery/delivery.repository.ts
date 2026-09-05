import config from '../../config';
import { TDeliverySetting, TUpdateDeliverySettingPayload } from './delivery.interfaces';
import { DeliverySetting, TDeliverySettingDocument } from './delivery.model';

const SINGLETON_KEY = 'default';

/** Environment driven fallback used until an admin saves the settings for the first time. */
const defaults: TDeliverySetting = {
	defaultCharge: config.commerce.default_delivery_charge,
	freeDeliveryEnabled: config.commerce.free_delivery_enabled,
	freeDeliveryThreshold: config.commerce.free_delivery_threshold,
	areas: []
};

const toSetting = (doc: TDeliverySettingDocument): TDeliverySetting => ({
	id: String(doc._id),
	defaultCharge: doc.defaultCharge,
	freeDeliveryEnabled: doc.freeDeliveryEnabled ?? false,
	freeDeliveryThreshold: doc.freeDeliveryThreshold ?? 0,
	areas: doc.areas ?? [],
	note: doc.note,
	updatedAt: doc.updatedAt
});

const getSetting = async (): Promise<TDeliverySetting> => {
	const found = await DeliverySetting.findOne({ singletonKey: SINGLETON_KEY }).lean();
	return found ? toSetting(found as TDeliverySettingDocument) : { ...defaults };
};

const upsertSetting = async (payload: TUpdateDeliverySettingPayload): Promise<TDeliverySetting> => {
	const current = await getSetting();
	const merged = { ...current, ...payload, singletonKey: SINGLETON_KEY };
	delete (merged as { id?: string }).id;
	delete (merged as { updatedAt?: Date }).updatedAt;

	const updated = await DeliverySetting.findOneAndUpdate({ singletonKey: SINGLETON_KEY }, merged, {
		new: true,
		upsert: true,
		runValidators: true,
		setDefaultsOnInsert: true
	}).lean();

	return toSetting(updated as TDeliverySettingDocument);
};

const DeliveryRepository = {
	getSetting,
	upsertSetting
};

export default DeliveryRepository;
