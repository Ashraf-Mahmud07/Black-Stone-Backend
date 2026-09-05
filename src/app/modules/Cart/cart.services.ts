import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { getEffectivePrice, roundMoney } from '../../utils/pricing';
import { ProductStatus, TProduct, TProductVariant } from '../Product/product.interfaces';
import ProductRepository from '../Product/product.repository';
import ProductServices from '../Product/product.services';
import { TAddCartItemPayload, TCartItem, TCartItemView, TCartView } from './cart.interfaces';
import CartRepository from './cart.repository';

const MAX_QUANTITY_PER_ITEM = 50;

export const buildVariantLabel = (variant?: TProductVariant): string | undefined => {
	if (!variant) return undefined;
	const label = [variant.color, variant.size, variant.design].filter(Boolean).join(' / ');
	return label || variant.sku;
};

const isSameLine = (a: TCartItem, b: { productId: string; variantId?: string }): boolean =>
	a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

/**
 * Builds the API representation of a cart. Unavailable lines are reported with an `issue`
 * instead of throwing so the customer can see and fix the cart before checking out.
 */
const buildCartView = async (items: TCartItem[]): Promise<TCartView> => {
	if (!items.length) {
		return { items: [], itemCount: 0, totals: { subtotal: 0, discount: 0, itemsTotal: 0 }, hasIssues: false };
	}

	const products = await ProductRepository.findManyByIds(items.map((item) => item.productId));
	const productMap = new Map<string, TProduct>(products.map((product) => [product.id, product]));

	const views: TCartItemView[] = items.map((item) => {
		const product = productMap.get(item.productId);
		if (!product) {
			return {
				productId: item.productId,
				variantId: item.variantId,
				name: 'Unavailable product',
				slug: '',
				sku: '',
				quantity: item.quantity,
				listPrice: 0,
				unitPrice: 0,
				lineTotal: 0,
				availableStock: 0,
				isAvailable: false,
				issue: 'This product is no longer available.'
			};
		}

		const variant = item.variantId ? product.variants.find((entry) => entry.id === item.variantId) : undefined;
		const listPrice = variant?.price ?? product.price;
		const discountPrice = variant?.price !== undefined ? variant.discountPrice : product.discountPrice;
		const unitPrice = getEffectivePrice(listPrice, discountPrice);
		const availableStock = variant ? variant.stock : product.stock;

		let issue: string | undefined;
		if (product.status !== ProductStatus.Active) issue = 'This product is currently unavailable.';
		else if (item.variantId && !variant) issue = 'The selected variant no longer exists.';
		else if (variant && !variant.isActive) issue = 'The selected variant is currently unavailable.';
		else if (availableStock < item.quantity) issue = `Only ${availableStock} item(s) left in stock.`;

		return {
			productId: product.id,
			variantId: item.variantId,
			name: product.name,
			slug: product.slug,
			sku: variant?.sku ?? product.sku,
			image: variant?.image ?? product.images.find((image) => image.isPrimary) ?? product.images[0],
			variantLabel: buildVariantLabel(variant),
			quantity: item.quantity,
			listPrice,
			unitPrice,
			lineTotal: roundMoney(unitPrice * item.quantity),
			availableStock,
			isAvailable: !issue,
			issue
		};
	});

	const available = views.filter((view) => view.isAvailable);
	const subtotal = roundMoney(available.reduce((sum, view) => sum + view.listPrice * view.quantity, 0));
	const itemsTotal = roundMoney(available.reduce((sum, view) => sum + view.lineTotal, 0));

	return {
		items: views,
		itemCount: views.reduce((sum, view) => sum + view.quantity, 0),
		totals: { subtotal, discount: roundMoney(subtotal - itemsTotal), itemsTotal },
		hasIssues: views.some((view) => !view.isAvailable)
	};
};

const getCart = async (userId: string): Promise<TCartView> => {
	const cart = await CartRepository.findByUserId(userId);
	return buildCartView(cart?.items ?? []);
};

const addItem = async (userId: string, payload: TAddCartItemPayload): Promise<TCartView> => {
	const cart = await CartRepository.findByUserId(userId);
	const items = cart?.items ?? [];
	const existing = items.find((item) => isSameLine(item, payload));
	const nextQuantity = (existing?.quantity ?? 0) + payload.quantity;

	if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
		throw new AppError(httpStatus.BAD_REQUEST, `You can add at most ${MAX_QUANTITY_PER_ITEM} units of one item!`);
	}

	// validates existence, status, variant and stock against trusted product data
	await ProductServices.resolvePurchasableLine(payload.productId, nextQuantity, payload.variantId);

	const nextItems = existing
		? items.map((item) => (isSameLine(item, payload) ? { ...item, quantity: nextQuantity } : item))
		: [...items, { productId: payload.productId, variantId: payload.variantId, quantity: payload.quantity }];

	const saved = await CartRepository.saveItems(userId, nextItems);
	return buildCartView(saved.items);
};

const updateItemQuantity = async (
	userId: string,
	target: { productId: string; variantId?: string },
	quantity: number
): Promise<TCartView> => {
	const cart = await CartRepository.findByUserId(userId);
	const items = cart?.items ?? [];
	const existing = items.find((item) => isSameLine(item, target));
	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, 'This item is not in your cart!');
	}
	if (quantity > MAX_QUANTITY_PER_ITEM) {
		throw new AppError(httpStatus.BAD_REQUEST, `You can add at most ${MAX_QUANTITY_PER_ITEM} units of one item!`);
	}

	await ProductServices.resolvePurchasableLine(target.productId, quantity, target.variantId);

	const nextItems = items.map((item) => (isSameLine(item, target) ? { ...item, quantity } : item));
	const saved = await CartRepository.saveItems(userId, nextItems);
	return buildCartView(saved.items);
};

const removeItem = async (userId: string, target: { productId: string; variantId?: string }): Promise<TCartView> => {
	const cart = await CartRepository.findByUserId(userId);
	const items = cart?.items ?? [];
	if (!items.some((item) => isSameLine(item, target))) {
		throw new AppError(httpStatus.NOT_FOUND, 'This item is not in your cart!');
	}
	const saved = await CartRepository.saveItems(
		userId,
		items.filter((item) => !isSameLine(item, target))
	);
	return buildCartView(saved.items);
};

const clearCart = async (userId: string): Promise<TCartView> => {
	await CartRepository.clear(userId);
	return buildCartView([]);
};

const CartServices = {
	getCart,
	addItem,
	updateItemQuantity,
	removeItem,
	clearCart,
	buildCartView
};

export default CartServices;
