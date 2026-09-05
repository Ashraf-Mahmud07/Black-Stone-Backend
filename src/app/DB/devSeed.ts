/* eslint-disable no-console */
import config from '../config';
import { UserRole } from '../interface/auth';
import CategoryRepository from '../modules/Category/category.repository';
import DeliveryRepository from '../modules/Delivery/delivery.repository';
import { ProductStatus, TVariantPayload } from '../modules/Product/product.interfaces';
import ProductRepository from '../modules/Product/product.repository';
import { ReviewStatus } from '../modules/Review/review.interfaces';
import ReviewRepository from '../modules/Review/review.repository';
import UserRepository from '../modules/User/user.repository';

type TSeedProduct = {
	name: string;
	slug: string;
	sku: string;
	categorySlug: string;
	description: string;
	shortDescription: string;
	price: number;
	discountPrice?: number;
	featured: boolean;
	tags: string[];
	variants: TVariantPayload[];
	specifications: { key: string; value: string }[];
};

const categories = [
	{ name: 'Hijab', description: 'Everyday and occasion hijabs in premium fabrics.', sortOrder: 1 },
	{ name: 'Orna', description: 'Hand crafted ornas to complete your look.', sortOrder: 2 },
	{ name: 'Three-Piece', description: 'Ready to wear three piece sets.', sortOrder: 3 }
];

const products: TSeedProduct[] = [
	{
		name: 'Premium Jersey Hijab',
		slug: 'premium-jersey-hijab',
		sku: 'HIJAB-JRSY01',
		categorySlug: 'hijab',
		description:
			'Soft premium jersey hijab with a comfortable stretch that stays in place all day. Breathable fabric, perfect for everyday wear.',
		shortDescription: 'Soft stretchy jersey hijab for everyday wear.',
		price: 850,
		discountPrice: 720,
		featured: true,
		tags: ['hijab', 'jersey', 'everyday'],
		specifications: [
			{ key: 'Fabric', value: 'Premium Jersey' },
			{ key: 'Size', value: '180cm x 75cm' },
			{ key: 'Wash care', value: 'Hand wash' }
		],
		variants: [
			{ sku: 'HIJAB-JRSY01-BLK', color: 'Black', size: 'Free', stock: 25 },
			{ sku: 'HIJAB-JRSY01-NVY', color: 'Navy', size: 'Free', stock: 18 },
			{ sku: 'HIJAB-JRSY01-BEG', color: 'Beige', size: 'Free', stock: 12 }
		]
	},
	{
		name: 'Georgette Embroidered Orna',
		slug: 'georgette-embroidered-orna',
		sku: 'ORNA-GEO01',
		categorySlug: 'orna',
		description:
			'Lightweight georgette orna with delicate hand embroidery along the border. A graceful finishing touch for any occasion.',
		shortDescription: 'Hand embroidered georgette orna.',
		price: 1450,
		featured: true,
		tags: ['orna', 'georgette', 'embroidery'],
		specifications: [
			{ key: 'Fabric', value: 'Georgette' },
			{ key: 'Work', value: 'Hand embroidery' }
		],
		variants: [
			{ sku: 'ORNA-GEO01-MRN', color: 'Maroon', design: 'Floral', stock: 10 },
			{ sku: 'ORNA-GEO01-GRN', color: 'Emerald', design: 'Floral', stock: 8 }
		]
	},
	{
		name: 'Cotton Block Print Three-Piece',
		slug: 'cotton-block-print-three-piece',
		sku: 'TP-BLOCK01',
		categorySlug: 'three-piece',
		description:
			'Unstitched cotton three piece with traditional block print. Includes kameez, salwar and orna in a coordinated palette.',
		shortDescription: 'Unstitched block print cotton three piece.',
		price: 2650,
		discountPrice: 2350,
		featured: false,
		tags: ['three-piece', 'cotton', 'block-print'],
		specifications: [
			{ key: 'Fabric', value: 'Cotton' },
			{ key: 'Includes', value: 'Kameez, Salwar, Orna' },
			{ key: 'Type', value: 'Unstitched' }
		],
		variants: [
			{ sku: 'TP-BLOCK01-S', size: 'S', color: 'Indigo', stock: 6 },
			{ sku: 'TP-BLOCK01-M', size: 'M', color: 'Indigo', stock: 9 },
			{ sku: 'TP-BLOCK01-L', size: 'L', color: 'Indigo', stock: 4 }
		]
	}
];

/**
 * Development seed data. Idempotent - existing records are reused instead of duplicated.
 * Never run automatically in production (guarded by SEED_DEV_DATA).
 */
const seedDevData = async (): Promise<void> => {
	// 1. categories
	const categoryIds = new Map<string, string>();
	for (const category of categories) {
		const slug = category.name.toLowerCase();
		const existing = await CategoryRepository.findBySlug(slug);
		const saved = existing ?? (await CategoryRepository.create({ ...category, slug }));
		categoryIds.set(slug, saved.id);
	}

	// 2. products with variants
	const productIds = new Map<string, string>();
	for (const product of products) {
		const existing = await ProductRepository.findBySlug(product.slug);
		if (existing) {
			productIds.set(product.slug, existing.id);
			continue;
		}

		const categoryId = categoryIds.get(product.categorySlug);
		if (!categoryId) continue;

		const created = await ProductRepository.create({
			name: product.name,
			slug: product.slug,
			sku: product.sku,
			description: product.description,
			shortDescription: product.shortDescription,
			categoryId,
			price: product.price,
			discountPrice: product.discountPrice,
			featured: product.featured,
			tags: product.tags,
			specifications: product.specifications,
			variants: product.variants,
			status: ProductStatus.Active,
			stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
			seo: { title: product.name, description: product.shortDescription, keywords: product.tags }
		});
		productIds.set(product.slug, created.id);
	}

	// 3. sample customer
	let customer = await UserRepository.findByEmail(config.seed_customer_email);
	if (!customer) {
		customer = await UserRepository.create({
			name: 'Test Customer',
			email: config.seed_customer_email,
			password: config.seed_customer_password,
			phone: '01712345678',
			role: UserRole.Customer
		});
	}

	// 4. reviews
	const reviewSeeds = [
		{ slug: 'premium-jersey-hijab', rating: 5, comment: 'Fabric quality is amazing, stays in place all day.' },
		{ slug: 'georgette-embroidered-orna', rating: 4, comment: 'Beautiful embroidery, colour is slightly darker.' }
	];

	for (const seed of reviewSeeds) {
		const productId = productIds.get(seed.slug);
		if (!productId) continue;
		const existing = await ReviewRepository.findByUserAndProduct(customer.id, productId);
		if (existing) continue;

		await ReviewRepository.create({
			productId,
			userId: customer.id,
			customerName: customer.name,
			rating: seed.rating,
			comment: seed.comment,
			status: ReviewStatus.Approved,
			isVerifiedPurchase: true
		});

		const summary = await ReviewRepository.getRatingSummary(productId);
		await ProductRepository.updateRating(productId, summary.ratingAverage, summary.ratingCount);
	}

	// 5. delivery settings
	const delivery = await DeliveryRepository.getSetting();
	if (!delivery.areas.length) {
		await DeliveryRepository.upsertSetting({
			defaultCharge: config.commerce.default_delivery_charge,
			freeDeliveryEnabled: config.commerce.free_delivery_enabled,
			freeDeliveryThreshold: config.commerce.free_delivery_threshold,
			areas: [
				{ key: 'inside-dhaka', name: 'Inside Dhaka', charge: 60, estimatedDays: '1-2 days', isActive: true },
				{ key: 'outside-dhaka', name: 'Outside Dhaka', charge: 130, estimatedDays: '3-5 days', isActive: true }
			],
			note: 'Delivery charges are collected with the order total.'
		});
	}

	console.log('Development seed data is ready.');
};

export default seedDevData;
