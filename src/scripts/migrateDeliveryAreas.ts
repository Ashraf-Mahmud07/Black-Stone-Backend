/* eslint-disable no-console */
import mongoose from 'mongoose';
import config from '../app/config';
import connectToDatabase from '../app/DB/connect';
import { DeliveryArea } from '../app/modules/Delivery/delivery.interfaces';
import { DeliverySetting } from '../app/modules/Delivery/delivery.model';
import { Order } from '../app/modules/Order/order.model';
import { normalizeBdPhone } from '../app/utils/phone';

/**
 * One-off migration for the cash-on-delivery / two-area simplification.
 *
 * It only ever fills in or re-spells fields - no money, status or customer data is changed:
 *
 * 1. DeliverySetting area keys  -> canonical `INSIDE_DHAKA` / `OUTSIDE_DHAKA`.
 * 2. Order.deliveryArea         -> canonical value. Orders without one are inferred from the
 *                                  delivery charge they were actually billed: a charge at or
 *                                  below the Inside Dhaka rate is treated as Inside Dhaka,
 *                                  anything higher as Outside Dhaka. A free-delivery order
 *                                  (charge 0) cannot be told apart, so it is left untouched
 *                                  rather than guessed.
 * 3. Phone numbers              -> canonical `01XXXXXXXXX`, so order tracking and duplicate
 *                                  detection match whatever the customer types.
 *
 * Run with: pnpm migrate:delivery-areas   (add --dry-run to preview)
 */

const DRY_RUN = process.argv.includes('--dry-run');

const canonicalise = (value: string): string =>
	value
		.trim()
		.toUpperCase()
		.replace(/[\s-]+/g, '_');

const toDeliveryArea = (value?: string): DeliveryArea | undefined => {
	if (!value) return undefined;
	const canonical = canonicalise(value);
	return Object.values(DeliveryArea).find((area) => area === canonical);
};

const migrateSettings = async (insideCharge: number): Promise<void> => {
	const setting = await DeliverySetting.findOne({ singletonKey: 'default' });
	if (!setting) {
		console.log('settings: none stored yet - the environment defaults already use the canonical keys');
		return;
	}

	let changed = false;
	setting.areas = (setting.areas ?? []).map((area) => {
		const canonical = toDeliveryArea(area.key);
		if (canonical && canonical !== area.key) {
			console.log(`settings: area "${area.key}" -> "${canonical}"`);
			changed = true;
			return { ...area, key: canonical };
		}
		return area;
	});

	const hasInside = setting.areas.some((area) => area.key === DeliveryArea.InsideDhaka);
	const hasOutside = setting.areas.some((area) => area.key === DeliveryArea.OutsideDhaka);
	if (!hasInside) {
		setting.areas.push({
			key: DeliveryArea.InsideDhaka,
			name: 'Inside Dhaka',
			charge: insideCharge,
			estimatedDays: '1-2 days',
			isActive: true
		});
		console.log(`settings: added INSIDE_DHAKA at ${insideCharge}`);
		changed = true;
	}
	if (!hasOutside) {
		setting.areas.push({
			key: DeliveryArea.OutsideDhaka,
			name: 'Outside Dhaka',
			charge: config.commerce.delivery_charge_outside_dhaka,
			estimatedDays: '3-5 days',
			isActive: true
		});
		console.log(`settings: added OUTSIDE_DHAKA at ${config.commerce.delivery_charge_outside_dhaka}`);
		changed = true;
	}

	if (changed && !DRY_RUN) await setting.save();
	if (!changed) console.log('settings: already canonical');
};

const migrateOrders = async (insideCharge: number): Promise<void> => {
	const orders = await Order.find({}).select('orderNumber deliveryArea deliveryCharge customer shippingAddress').lean();
	console.log(`orders: ${orders.length} found`);

	let areaUpdates = 0;
	let phoneUpdates = 0;

	for (const order of orders) {
		const set: Record<string, unknown> = {};

		const canonical = toDeliveryArea(order.deliveryArea);
		if (order.deliveryArea && canonical && canonical !== order.deliveryArea) {
			set.deliveryArea = canonical;
		} else if (!order.deliveryArea) {
			// infer from what the customer was actually charged; never guess on a free delivery
			const charge = order.deliveryCharge ?? 0;
			if (charge > 0) {
				set.deliveryArea = charge <= insideCharge ? DeliveryArea.InsideDhaka : DeliveryArea.OutsideDhaka;
			}
		}

		const customerPhone = normalizeBdPhone(order.customer?.phone);
		if (customerPhone && customerPhone !== order.customer?.phone) set['customer.phone'] = customerPhone;

		const shippingPhone = normalizeBdPhone(order.shippingAddress?.phone);
		if (shippingPhone && shippingPhone !== order.shippingAddress?.phone) set['shippingAddress.phone'] = shippingPhone;

		if (!Object.keys(set).length) continue;
		if (set.deliveryArea) areaUpdates += 1;
		if (set['customer.phone'] || set['shippingAddress.phone']) phoneUpdates += 1;

		console.log(`order ${order.orderNumber}: ${JSON.stringify(set)}`);
		if (!DRY_RUN) await Order.updateOne({ _id: order._id }, { $set: set });
	}

	console.log(
		`orders: ${areaUpdates} delivery areas, ${phoneUpdates} phone numbers ${DRY_RUN ? 'would be' : ''} updated`
	);
};

const run = async (): Promise<void> => {
	try {
		await connectToDatabase();
		console.log(`${DRY_RUN ? 'DRY RUN - ' : ''}migrating delivery areas on "${mongoose.connection.db?.databaseName}"`);

		const insideCharge = config.commerce.delivery_charge_inside_dhaka;
		await migrateSettings(insideCharge);
		await migrateOrders(insideCharge);

		console.log('migration complete.');
		process.exit(0);
	} catch (error) {
		console.error('migration failed:', error);
		process.exit(1);
	}
};

run();
