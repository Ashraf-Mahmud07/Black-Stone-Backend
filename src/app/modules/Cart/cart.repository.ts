import { isValidId } from '../../DB/dbHelpers';
import { TCart, TCartItem } from './cart.interfaces';
import { Cart, TCartDocument } from './cart.model';

const toCart = (doc: TCartDocument): TCart => ({
	id: String(doc._id),
	userId: String(doc.user),
	items: (doc.items ?? []).map((item) => ({
		productId: String(item.product),
		variantId: item.variantId ? String(item.variantId) : undefined,
		quantity: item.quantity,
		addedAt: item.addedAt
	})),
	updatedAt: doc.updatedAt
});

const toDocumentItems = (items: TCartItem[]) =>
	items.map((item) => ({
		product: item.productId,
		variantId: item.variantId,
		quantity: item.quantity,
		addedAt: item.addedAt ?? new Date()
	}));

const findByUserId = async (userId: string): Promise<TCart | null> => {
	if (!isValidId(userId)) return null;
	const found = await Cart.findOne({ user: userId }).lean();
	return found ? toCart(found as TCartDocument) : null;
};

/** Replaces the whole item list - the service owns all cart merge rules. */
const saveItems = async (userId: string, items: TCartItem[]): Promise<TCart> => {
	const updated = await Cart.findOneAndUpdate(
		{ user: userId },
		{ user: userId, items: toDocumentItems(items) },
		{ new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
	).lean();
	return toCart(updated as TCartDocument);
};

const clear = async (userId: string): Promise<TCart> => saveItems(userId, []);

const CartRepository = {
	findByUserId,
	saveItems,
	clear
};

export default CartRepository;
