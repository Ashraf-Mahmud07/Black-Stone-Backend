import { describe, expect, it } from 'vitest';
import {
	calculateAdjustedTotals,
	calculateItemsPayable,
	calculateOrderTotals,
	getEffectivePrice,
	roundMoney
} from '../app/utils/pricing';

describe('getEffectivePrice', () => {
	it('returns the price when there is no discount', () => {
		expect(getEffectivePrice(850)).toBe(850);
	});

	it('returns the discount price when it is lower than the price', () => {
		expect(getEffectivePrice(850, 720)).toBe(720);
	});

	it('ignores a discount that is not lower than the price', () => {
		expect(getEffectivePrice(850, 850)).toBe(850);
		expect(getEffectivePrice(850, 900)).toBe(850);
		expect(getEffectivePrice(850, 0)).toBe(850);
	});
});

describe('calculateOrderTotals', () => {
	it('calculates subtotal, discount, delivery and grand total', () => {
		const totals = calculateOrderTotals(
			[
				{ listPrice: 850, unitPrice: 720, quantity: 2 },
				{ listPrice: 1450, unitPrice: 1450, quantity: 1 }
			],
			60
		);

		expect(totals.subtotal).toBe(3150);
		expect(totals.discount).toBe(260);
		expect(totals.deliveryCharge).toBe(60);
		expect(totals.total).toBe(2950);
	});

	it('treats a missing delivery charge as zero and never accepts a negative one', () => {
		expect(calculateOrderTotals([{ listPrice: 100, unitPrice: 100, quantity: 1 }]).total).toBe(100);
		expect(calculateOrderTotals([{ listPrice: 100, unitPrice: 100, quantity: 1 }], -50).deliveryCharge).toBe(0);
	});

	it('returns zeroed totals for an empty basket', () => {
		expect(calculateOrderTotals([], 0)).toEqual({ subtotal: 0, discount: 0, deliveryCharge: 0, total: 0 });
	});

	it('rounds money to two decimals', () => {
		expect(roundMoney(10.005)).toBe(10.01);
		expect(calculateOrderTotals([{ listPrice: 33.333, unitPrice: 33.333, quantity: 3 }]).total).toBe(100);
	});
});

describe('calculateAdjustedTotals', () => {
	const order = { subtotal: 1700, discount: 260, deliveryCharge: 60 };

	it('subtracts the manual discount on top of the item discount', () => {
		expect(calculateAdjustedTotals({ ...order, manualDiscount: 250 })).toEqual({
			subtotal: 1700,
			discount: 260,
			manualDiscount: 250,
			deliveryCharge: 60,
			total: 1250
		});
	});

	it('matches the checkout total when there is no manual discount', () => {
		const adjusted = calculateAdjustedTotals(order);
		expect(adjusted.manualDiscount).toBe(0);
		expect(adjusted.total).toBe(1500);
		expect(adjusted.total).toBe(calculateOrderTotals([{ listPrice: 1700, unitPrice: 1440, quantity: 1 }], 60).total);
	});

	it('treats a waived delivery charge as zero', () => {
		expect(calculateAdjustedTotals({ ...order, deliveryCharge: 0, manualDiscount: 250 }).total).toBe(1190);
	});

	it('never lets a negative input increase the total', () => {
		expect(calculateAdjustedTotals({ ...order, manualDiscount: -100 }).manualDiscount).toBe(0);
		expect(calculateAdjustedTotals({ ...order, deliveryCharge: -50 }).deliveryCharge).toBe(0);
	});

	it('rounds every amount to two decimals', () => {
		const totals = calculateAdjustedTotals({
			subtotal: 100.005,
			discount: 0,
			manualDiscount: 33.333,
			deliveryCharge: 10.001
		});
		expect(totals.subtotal).toBe(100.01);
		expect(totals.manualDiscount).toBe(33.33);
		expect(totals.total).toBe(76.68);
	});
});

describe('calculateItemsPayable', () => {
	it('is the item amount a manual discount may eat into', () => {
		expect(calculateItemsPayable(1700, 260)).toBe(1440);
		expect(calculateItemsPayable(1700, 0)).toBe(1700);
	});
});
