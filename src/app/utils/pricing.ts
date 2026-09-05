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
