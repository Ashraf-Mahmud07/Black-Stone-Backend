/**
 * Money helpers. Every amount that reaches the database or the API passes through here so
 * rounding stays consistent and totals are always derived from trusted server side data.
 */

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Returns the price a customer actually pays for one unit. */
export const getEffectivePrice = (price: number, discountPrice?: number): number => {
	if (discountPrice === undefined || discountPrice === null) return roundMoney(price);
	if (discountPrice <= 0 || discountPrice >= price) return roundMoney(price);
	return roundMoney(discountPrice);
};

export type TPriceableLine = {
	/** Original (pre discount) unit price. */
	listPrice: number;
	/** Unit price after the product/variant discount. */
	unitPrice: number;
	quantity: number;
};

export type TOrderTotals = {
	subtotal: number;
	discount: number;
	deliveryCharge: number;
	total: number;
};

export const calculateLineSubtotal = (line: TPriceableLine): number => roundMoney(line.unitPrice * line.quantity);

/**
 * subtotal  = sum(listPrice * quantity)
 * discount  = sum((listPrice - unitPrice) * quantity)
 * total     = subtotal - discount + deliveryCharge
 */
export const calculateOrderTotals = (lines: TPriceableLine[], deliveryCharge = 0): TOrderTotals => {
	const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.listPrice * line.quantity, 0));
	const discount = roundMoney(lines.reduce((sum, line) => sum + (line.listPrice - line.unitPrice) * line.quantity, 0));
	const charge = roundMoney(deliveryCharge < 0 ? 0 : deliveryCharge);

	return {
		subtotal,
		discount,
		deliveryCharge: charge,
		total: roundMoney(subtotal - discount + charge)
	};
};

export type TAdjustedTotalsInput = {
	/** Sum of listPrice * quantity, as stored on the order. */
	subtotal: number;
	/** Item level discount, derived at checkout from the catalogue prices. */
	discount: number;
	/** Absolute amount an admin negotiated off, on top of the item discount. */
	manualDiscount?: number;
	deliveryCharge: number;
};

export type TAdjustedTotals = TOrderTotals & { manualDiscount: number };

/**
 * Recalculates an existing order's total after an admin adjustment.
 *
 * total = subtotal - discount - manualDiscount + deliveryCharge
 *
 * `discount` stays the derived item level figure so it remains auditable; a negotiated
 * amount is carried separately in `manualDiscount`.
 */
export const calculateAdjustedTotals = (input: TAdjustedTotalsInput): TAdjustedTotals => {
	const subtotal = roundMoney(input.subtotal);
	const discount = roundMoney(input.discount);
	const manualDiscount = roundMoney(input.manualDiscount && input.manualDiscount > 0 ? input.manualDiscount : 0);
	const deliveryCharge = roundMoney(input.deliveryCharge < 0 ? 0 : input.deliveryCharge);

	return {
		subtotal,
		discount,
		manualDiscount,
		deliveryCharge,
		total: roundMoney(subtotal - discount - manualDiscount + deliveryCharge)
	};
};

/** The item amount a manual discount is allowed to eat into. */
export const calculateItemsPayable = (subtotal: number, discount: number): number => roundMoney(subtotal - discount);
