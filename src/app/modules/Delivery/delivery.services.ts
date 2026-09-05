import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TDeliverySetting, TUpdateDeliverySettingPayload } from './delivery.interfaces';
import DeliveryRepository from './delivery.repository';

const getDeliverySetting = async (): Promise<TDeliverySetting> => DeliveryRepository.getSetting();

const updateDeliverySetting = async (payload: TUpdateDeliverySettingPayload): Promise<TDeliverySetting> => {
	if (payload.areas) {
		const keys = payload.areas.map((area) => area.key.toLowerCase());
		if (new Set(keys).size !== keys.length) {
			throw new AppError(httpStatus.BAD_REQUEST, 'Delivery area keys must be unique!');
		}
	}
	if (payload.freeDeliveryEnabled && !(payload.freeDeliveryThreshold ?? 0)) {
		const current = await DeliveryRepository.getSetting();
		if (!current.freeDeliveryThreshold) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				'A free delivery threshold is required when free delivery is enabled!'
			);
		}
	}

	return DeliveryRepository.upsertSetting(payload);
};

const DeliveryServices = {
	getDeliverySetting,
	updateDeliverySetting
};

export default DeliveryServices;
