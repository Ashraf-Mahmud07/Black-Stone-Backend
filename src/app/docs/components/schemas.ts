import { UserRole } from '../../interface/auth';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../modules/Order/order.interfaces';
import { ProductStatus } from '../../modules/Product/product.interfaces';
import { ReviewStatus } from '../../modules/Review/review.interfaces';
import { Status as UserStatus } from '../../modules/User/user.interfaces';
import { TSchemaObject, ref } from '../types';

/** Enum values are read from the application enums so the spec cannot drift from the code. */
const enumValues = (source: Record<string, string>): string[] => Object.values(source);

const objectId: TSchemaObject = {
	type: 'string',
	pattern: '^[a-f\\d]{24}$',
	example: '6650f1a2b3c4d5e6f7a8b9c0',
	description: 'Resource identifier.'
};

const phone: TSchemaObject = {
	type: 'string',
	pattern: '^(?:\\+?88)?01[3-9]\\d{8}$',
	example: '01712345678',
	description: 'Bangladeshi mobile number.'
};

const money: TSchemaObject = { type: 'number', minimum: 0, example: 850, description: 'Amount in BDT.' };

// ---------------------------------------------------------------------------
// envelopes, errors, pagination
// ---------------------------------------------------------------------------

const ErrorSource: TSchemaObject = {
	type: 'object',
	properties: {
		path: {
			type: 'string',
			example: 'password',
			description: 'Field the error belongs to (empty for general errors).'
		},
		message: { type: 'string', example: 'Password must contain at least one number!' }
	},
	required: ['path', 'message']
};

const ErrorResponse: TSchemaObject = {
	type: 'object',
	description:
		'Standard error envelope produced by the global error handler. A `stack` property is added only when NODE_ENV=development.',
	properties: {
		success: { type: 'boolean', example: false },
		message: { type: 'string', example: 'Validation Error' },
		errorSources: { type: 'array', items: ref('ErrorSource') }
	},
	required: ['success', 'message', 'errorSources']
};

const PaginationMeta: TSchemaObject = {
	type: 'object',
	description: 'Pagination information returned with every list endpoint.',
	properties: {
		page: { type: 'integer', example: 1 },
		limit: { type: 'integer', example: 10 },
		total: { type: 'integer', example: 42 },
		totalPage: { type: 'integer', example: 5 }
	},
	required: ['page', 'limit', 'total', 'totalPage']
};

// ---------------------------------------------------------------------------
// shared value objects
// ---------------------------------------------------------------------------

const Image: TSchemaObject = {
	type: 'object',
	description: 'Stored media reference. Every file is hosted on Cloudinary.',
	properties: {
		url: {
			type: 'string',
			format: 'uri',
			example: 'https://res.cloudinary.com/demo/image/upload/v1712345678/black-stone/products/hijab-black.webp'
		},
		key: {
			type: 'string',
			description: 'Cloudinary handle, used internally to delete the asset.',
			example: 'upload:image:black-stone/products/hijab-black'
		},
		alt: { type: 'string', example: 'Premium jersey hijab in black' },
		isPrimary: { type: 'boolean', example: true },
		resourceType: { type: 'string', enum: ['image', 'video'], default: 'image', example: 'image' },
		thumbnailUrl: {
			type: 'string',
			format: 'uri',
			description: 'Poster frame, present for videos stored on Cloudinary.',
			example: 'https://res.cloudinary.com/demo/video/upload/black-stone/products/clip.jpg'
		},
		width: { type: 'integer', example: 1200 },
		height: { type: 'integer', example: 1600 },
		duration: { type: 'number', description: 'Video length in seconds.', example: 12.4 }
	},
	required: ['url']
};

const Picture: TSchemaObject = {
	type: 'object',
	description: 'Profile picture reference.',
	properties: {
		url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/avatars/ayesha.png' },
		publicId: { type: 'string', example: 'avatars/ayesha' }
	},
	required: ['url', 'publicId']
};

const Address: TSchemaObject = {
	type: 'object',
	description: 'Saved customer address.',
	properties: {
		label: { type: 'string', example: 'Home' },
		name: { type: 'string', example: 'Ayesha Rahman' },
		phone,
		addressLine: { type: 'string', minLength: 5, example: 'House 12, Road 4, Dhanmondi' },
		area: { type: 'string', example: 'Dhanmondi' },
		city: { type: 'string', minLength: 2, example: 'Dhaka' },
		district: { type: 'string', example: 'Dhaka' },
		postalCode: { type: 'string', example: '1209' },
		isDefault: { type: 'boolean', example: true }
	},
	required: ['addressLine', 'city']
};

// ---------------------------------------------------------------------------
// auth / users
// ---------------------------------------------------------------------------

const User: TSchemaObject = {
	type: 'object',
	description: 'Customer profile. Password hashes are never returned.',
	properties: {
		id: objectId,
		name: { type: 'string', example: 'Ayesha Rahman' },
		username: { type: 'string', nullable: true, example: 'ayesha' },
		email: { type: 'string', format: 'email', example: 'ayesha@example.com' },
		phone: { ...phone, nullable: true },
		// customers live in their own collection - an admin is never returned as a User
		role: { type: 'string', enum: [UserRole.Customer], example: UserRole.Customer },
		isVerified: { type: 'boolean', example: false },
		location: { type: 'string', nullable: true, example: 'Dhaka' },
		picture: { ...Picture, nullable: true },
		addresses: { type: 'array', items: ref('Address') },
		status: { type: 'string', enum: enumValues(UserStatus), example: UserStatus.Active },
		tokenVersion: {
			type: 'integer',
			description: 'Session counter. Increases on logout and password change, invalidating older tokens.',
			example: 0
		},
		isDeleted: { type: 'boolean', example: false },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: ['id', 'name', 'email', 'role', 'status', 'addresses']
};

const AdminUser: TSchemaObject = {
	type: 'object',
	description: 'Administrator profile.',
	properties: {
		id: objectId,
		name: { type: 'string', example: 'Super Admin' },
		email: { type: 'string', format: 'email', example: 'admin@blackstone.test' },
		phone: { ...phone, nullable: true },
		role: { type: 'string', enum: [UserRole.Admin], example: UserRole.Admin },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: ['id', 'name', 'email', 'role']
};

const AuthTokens: TSchemaObject = {
	type: 'object',
	description:
		'Access token for the `Authorization: Bearer` header plus a refresh token. The refresh token is also set as an httpOnly `refreshToken` cookie.',
	properties: {
		accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>' },
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>' },
		user: { oneOf: [ref('User'), ref('AdminUser')] }
	},
	required: ['accessToken', 'refreshToken', 'user']
};

const AccessToken: TSchemaObject = {
	type: 'object',
	properties: {
		accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>' }
	},
	required: ['accessToken']
};

// ---------------------------------------------------------------------------
// catalog
// ---------------------------------------------------------------------------

const Category: TSchemaObject = {
	type: 'object',
	properties: {
		id: objectId,
		name: { type: 'string', example: 'Hijab' },
		slug: { type: 'string', example: 'hijab', description: 'Generated from the name, unique.' },
		description: { type: 'string', nullable: true, example: 'Everyday and occasion hijabs in premium fabrics.' },
		image: { ...Image, nullable: true },
		sortOrder: { type: 'integer', example: 1 },
		isActive: { type: 'boolean', example: true },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: ['id', 'name', 'slug', 'sortOrder', 'isActive']
};

const CategorySummary: TSchemaObject = {
	type: 'object',
	description: 'Category reference embedded in product responses.',
	properties: {
		id: objectId,
		name: { type: 'string', example: 'Hijab' },
		slug: { type: 'string', example: 'hijab' }
	},
	required: ['id', 'name', 'slug']
};

const Specification: TSchemaObject = {
	type: 'object',
	properties: {
		key: { type: 'string', example: 'Fabric' },
		value: { type: 'string', example: 'Premium Jersey' }
	},
	required: ['key', 'value']
};

const Seo: TSchemaObject = {
	type: 'object',
	properties: {
		title: { type: 'string', maxLength: 120, example: 'Premium Jersey Hijab' },
		description: { type: 'string', maxLength: 320, example: 'Soft stretchy jersey hijab for everyday wear.' },
		keywords: { type: 'array', items: { type: 'string' }, example: ['hijab', 'jersey'] }
	}
};

const ProductVariant: TSchemaObject = {
	type: 'object',
	description:
		'Product variant. When a product has variants, stock is tracked per variant and the product `stock` is their sum.',
	properties: {
		id: objectId,
		sku: { type: 'string', example: 'HIJAB-JRSY01-BLK' },
		color: { type: 'string', nullable: true, example: 'Black' },
		size: { type: 'string', nullable: true, example: 'Free' },
		design: { type: 'string', nullable: true, example: 'Plain' },
		attributes: {
			type: 'object',
			additionalProperties: { type: 'string' },
			description: 'Free-form extra attributes.',
			example: { work: 'Hand embroidery' }
		},
		price: { ...money, nullable: true, description: 'Overrides the product price when set.' },
		discountPrice: { ...money, nullable: true, description: 'Only applies when the variant defines its own price.' },
		stock: { type: 'integer', minimum: 0, example: 25 },
		image: { ...Image, nullable: true },
		isActive: { type: 'boolean', example: true }
	},
	required: ['id', 'sku', 'stock', 'isActive']
};

const Product: TSchemaObject = {
	type: 'object',
	properties: {
		id: objectId,
		name: { type: 'string', example: 'Premium Jersey Hijab' },
		slug: { type: 'string', example: 'premium-jersey-hijab' },
		description: { type: 'string', example: 'Soft premium jersey hijab with a comfortable stretch.' },
		shortDescription: { type: 'string', nullable: true, maxLength: 300, example: 'Soft stretchy jersey hijab.' },
		categoryId: objectId,
		// present on every read endpoint; absent on the few write responses that skip population
		category: ref('CategorySummary'),
		images: { type: 'array', items: ref('Image') },
		videos: { type: 'array', items: ref('Image'), description: 'Product videos (max 3).' },
		price: { ...money, example: 850 },
		discountPrice: { ...money, nullable: true, example: 720, description: 'Always lower than `price` when present.' },
		sku: { type: 'string', example: 'HIJAB-JRSY01' },
		variants: { type: 'array', items: ref('ProductVariant') },
		specifications: { type: 'array', items: ref('Specification') },
		stock: { type: 'integer', minimum: 0, example: 55 },
		status: {
			type: 'string',
			enum: enumValues(ProductStatus),
			example: ProductStatus.Active,
			description: 'Only `active` products are visible to customers.'
		},
		featured: { type: 'boolean', example: true },
		tags: { type: 'array', items: { type: 'string' }, example: ['hijab', 'jersey'] },
		seo: { ...Seo, nullable: true },
		ratingAverage: { type: 'number', minimum: 0, maximum: 5, example: 4.7, description: 'From approved reviews only.' },
		ratingCount: { type: 'integer', minimum: 0, example: 12 },
		isDeleted: {
			type: 'boolean',
			example: false,
			description: 'Products are soft deleted so historical orders stay valid.'
		},
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: [
		'id',
		'name',
		'slug',
		'description',
		'categoryId',
		'images',
		'videos',
		'price',
		'sku',
		'variants',
		'specifications',
		'stock',
		'status',
		'featured',
		'tags',
		'ratingAverage',
		'ratingCount',
		'isDeleted'
	]
};

// ---------------------------------------------------------------------------
// cart
// ---------------------------------------------------------------------------

const CartItem: TSchemaObject = {
	type: 'object',
	description: 'Cart line enriched with trusted product data. Prices are calculated by the server on every read.',
	properties: {
		productId: objectId,
		variantId: { ...objectId, nullable: true },
		name: { type: 'string', example: 'Premium Jersey Hijab' },
		slug: { type: 'string', example: 'premium-jersey-hijab' },
		sku: { type: 'string', example: 'HIJAB-JRSY01-BLK' },
		image: { ...Image, nullable: true },
		variantLabel: { type: 'string', nullable: true, example: 'Black / Free' },
		quantity: { type: 'integer', minimum: 1, example: 2 },
		listPrice: { ...money, example: 850, description: 'Price before discount.' },
		unitPrice: { ...money, example: 720, description: 'Price actually charged per unit.' },
		lineTotal: { ...money, example: 1440 },
		availableStock: { type: 'integer', example: 25 },
		isAvailable: { type: 'boolean', example: true },
		issue: {
			type: 'string',
			nullable: true,
			description: 'Why the line cannot be ordered (out of stock, inactive product, removed variant).',
			example: 'Only 1 item(s) left in stock.'
		}
	},
	required: ['productId', 'name', 'quantity', 'listPrice', 'unitPrice', 'lineTotal', 'availableStock', 'isAvailable']
};

const Cart: TSchemaObject = {
	type: 'object',
	properties: {
		items: { type: 'array', items: ref('CartItem') },
		itemCount: { type: 'integer', example: 3, description: 'Total quantity across all lines.' },
		totals: {
			type: 'object',
			description: 'Totals over the available lines only. Delivery charge is added at checkout.',
			properties: {
				subtotal: { ...money, example: 1700 },
				discount: { ...money, example: 260 },
				itemsTotal: { ...money, example: 1440 }
			},
			required: ['subtotal', 'discount', 'itemsTotal']
		},
		hasIssues: { type: 'boolean', example: false }
	},
	required: ['items', 'itemCount', 'totals', 'hasIssues']
};

// ---------------------------------------------------------------------------
// checkout / orders
// ---------------------------------------------------------------------------

const ShippingAddress: TSchemaObject = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 2, example: 'Ayesha Rahman' },
		phone,
		email: { type: 'string', format: 'email', nullable: true, example: 'ayesha@example.com' },
		addressLine: { type: 'string', minLength: 5, example: 'House 12, Road 4, Dhanmondi' },
		area: { type: 'string', nullable: true, example: 'Dhanmondi' },
		city: { type: 'string', minLength: 2, example: 'Dhaka' },
		district: { type: 'string', nullable: true, example: 'Dhaka' },
		postalCode: { type: 'string', nullable: true, example: '1209' },
		deliveryNotes: { type: 'string', maxLength: 500, nullable: true, example: 'Call before delivery' }
	},
	required: ['name', 'phone', 'addressLine', 'city']
};

const CustomerSnapshot: TSchemaObject = {
	type: 'object',
	description: 'Customer details captured when the order was placed.',
	properties: {
		userId: { ...objectId, nullable: true, description: 'Absent for guest orders.' },
		name: { type: 'string', example: 'Ayesha Rahman' },
		phone,
		email: { type: 'string', format: 'email', nullable: true, example: 'ayesha@example.com' },
		isGuest: { type: 'boolean', example: false }
	},
	required: ['name', 'phone', 'isGuest']
};

const ProductSnapshot: TSchemaObject = {
	type: 'object',
	description: 'Frozen product data. Historical orders stay correct after the catalog changes.',
	properties: {
		productId: objectId,
		name: { type: 'string', example: 'Premium Jersey Hijab' },
		slug: { type: 'string', example: 'premium-jersey-hijab' },
		sku: { type: 'string', example: 'HIJAB-JRSY01' },
		image: { ...Image, nullable: true },
		specifications: { type: 'array', items: ref('Specification') }
	},
	required: ['productId', 'name', 'slug', 'sku']
};

const VariantSnapshot: TSchemaObject = {
	type: 'object',
	properties: {
		variantId: objectId,
		sku: { type: 'string', example: 'HIJAB-JRSY01-BLK' },
		label: { type: 'string', nullable: true, example: 'Black / Free' },
		color: { type: 'string', nullable: true, example: 'Black' },
		size: { type: 'string', nullable: true, example: 'Free' },
		design: { type: 'string', nullable: true },
		attributes: { type: 'object', additionalProperties: { type: 'string' } }
	},
	required: ['variantId', 'sku']
};

const OrderItem: TSchemaObject = {
	type: 'object',
	properties: {
		product: ref('ProductSnapshot'),
		// absent when the ordered product has no variants
		variant: ref('VariantSnapshot'),
		quantity: { type: 'integer', minimum: 1, example: 2 },
		listPrice: { ...money, example: 850 },
		unitPrice: { ...money, example: 720 },
		discount: { ...money, example: 260, description: '(listPrice - unitPrice) * quantity.' },
		subtotal: { ...money, example: 1440, description: 'unitPrice * quantity.' }
	},
	required: ['product', 'quantity', 'listPrice', 'unitPrice', 'discount', 'subtotal']
};

const OrderStatusHistoryEntry: TSchemaObject = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: enumValues(OrderStatus), example: OrderStatus.Confirmed },
		at: { type: 'string', format: 'date-time' },
		byId: { ...objectId, nullable: true },
		byRole: { type: 'string', nullable: true, enum: [...enumValues(UserRole), 'guest'], example: UserRole.Admin },
		note: { type: 'string', nullable: true, example: 'Confirmed over phone' }
	},
	required: ['status', 'at']
};

const Order: TSchemaObject = {
	type: 'object',
	description: 'Order status and payment status are independent - see the `status` and `paymentStatus` fields.',
	properties: {
		id: objectId,
		orderNumber: { type: 'string', example: 'BS-260309-A1B2C3', description: 'Human friendly unique reference.' },
		userId: { ...objectId, nullable: true, description: 'Absent for guest orders.' },
		customer: ref('CustomerSnapshot'),
		shippingAddress: ref('ShippingAddress'),
		items: { type: 'array', items: ref('OrderItem') },
		subtotal: { ...money, example: 1700, description: 'Sum of listPrice * quantity.' },
		discount: { ...money, example: 260 },
		deliveryCharge: { ...money, example: 60 },
		deliveryArea: { type: 'string', nullable: true, example: 'inside-dhaka' },
		total: { ...money, example: 1500, description: 'subtotal - discount + deliveryCharge.' },
		paymentMethod: { type: 'string', enum: enumValues(PaymentMethod), example: PaymentMethod.Bkash },
		paymentStatus: { type: 'string', enum: enumValues(PaymentStatus), example: PaymentStatus.Pending },
		paymentId: { ...objectId, nullable: true },
		status: { type: 'string', enum: enumValues(OrderStatus), example: OrderStatus.Pending },
		statusHistory: { type: 'array', items: ref('OrderStatusHistoryEntry') },
		customerNotes: { type: 'string', nullable: true, maxLength: 500, example: 'Gift wrap please' },
		adminNotes: { type: 'string', nullable: true, example: 'Customer requested evening delivery' },
		stockRestored: { type: 'boolean', example: false, description: 'True once cancelled stock has been returned.' },
		cancellationReason: { type: 'string', nullable: true, example: 'Ordered the wrong colour' },
		confirmedAt: { type: 'string', format: 'date-time', nullable: true },
		deliveredAt: { type: 'string', format: 'date-time', nullable: true },
		cancelledAt: { type: 'string', format: 'date-time', nullable: true },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: [
		'id',
		'orderNumber',
		'customer',
		'shippingAddress',
		'items',
		'subtotal',
		'discount',
		'deliveryCharge',
		'total',
		'paymentMethod',
		'paymentStatus',
		'status',
		'statusHistory',
		'stockRestored'
	]
};

const CheckoutSummaryItem: TSchemaObject = {
	type: 'object',
	properties: {
		productId: objectId,
		variantId: { ...objectId, nullable: true },
		name: { type: 'string', example: 'Premium Jersey Hijab' },
		image: { ...Image, nullable: true },
		variantLabel: { type: 'string', nullable: true, example: 'Black / Free' },
		quantity: { type: 'integer', minimum: 1, example: 2 },
		listPrice: { ...money, example: 850 },
		unitPrice: { ...money, example: 720 },
		subtotal: { ...money, example: 1440 }
	},
	required: ['productId', 'name', 'quantity', 'listPrice', 'unitPrice', 'subtotal']
};

const CheckoutSummary: TSchemaObject = {
	type: 'object',
	description: 'Server calculated totals. Any price, discount, delivery charge or total sent by the client is ignored.',
	properties: {
		items: { type: 'array', items: ref('CheckoutSummaryItem') },
		subtotal: { ...money, example: 1700 },
		discount: { ...money, example: 260 },
		deliveryCharge: { ...money, example: 60 },
		deliveryArea: { type: 'string', nullable: true, example: 'inside-dhaka' },
		isFreeDelivery: { type: 'boolean', example: false },
		total: { ...money, example: 1500 }
	},
	required: ['items', 'subtotal', 'discount', 'deliveryCharge', 'isFreeDelivery', 'total']
};

const PaymentInstructions: TSchemaObject = {
	type: 'object',
	description: 'What the customer has to do to pay. Merchant numbers come from the server configuration.',
	properties: {
		method: { type: 'string', enum: enumValues(PaymentMethod), example: PaymentMethod.Bkash },
		merchantNumber: {
			type: 'string',
			nullable: true,
			example: '01700000000',
			description: 'Absent for cash on delivery.'
		},
		accountType: { type: 'string', nullable: true, example: 'personal' },
		payableAmount: { ...money, example: 1500 },
		instructions: {
			type: 'array',
			items: { type: 'string' },
			example: [
				'Open your bKash app and choose "Send Money".',
				'Send exactly 1500 BDT to 01700000000 (personal).',
				'Copy the transaction ID from the confirmation message.',
				'Submit the transaction ID and a screenshot on the payment page to complete your order.'
			]
		}
	},
	required: ['method', 'payableAmount', 'instructions']
};

const CreateOrderResult: TSchemaObject = {
	type: 'object',
	properties: {
		order: ref('Order'),
		paymentInstructions: ref('PaymentInstructions')
	},
	required: ['order', 'paymentInstructions']
};

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------

const PaymentHistoryEntry: TSchemaObject = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: enumValues(PaymentStatus), example: PaymentStatus.Submitted },
		at: { type: 'string', format: 'date-time' },
		byId: { ...objectId, nullable: true },
		byRole: { type: 'string', nullable: true, enum: [...enumValues(UserRole), 'guest'], example: UserRole.Customer },
		note: { type: 'string', nullable: true, example: 'Payment details submitted' }
	},
	required: ['status', 'at']
};

const Payment: TSchemaObject = {
	type: 'object',
	description:
		'Payment record for one order. The screenshot storage key is never returned - the file is streamed through `GET /api/payments/{id}/screenshot`.',
	properties: {
		id: objectId,
		orderId: objectId,
		orderNumber: { type: 'string', example: 'BS-260309-A1B2C3' },
		method: { type: 'string', enum: enumValues(PaymentMethod), example: PaymentMethod.Bkash },
		amount: { ...money, example: 1500 },
		status: { type: 'string', enum: enumValues(PaymentStatus), example: PaymentStatus.Submitted },
		transactionId: { type: 'string', nullable: true, example: 'TRX9AB12CD34', description: 'Unique across orders.' },
		senderNumber: { ...phone, nullable: true },
		hasScreenshot: { type: 'boolean', example: true },
		screenshotUrl: {
			type: 'string',
			nullable: true,
			example: '/api/payments/6650f1a2b3c4d5e6f7a8b9c0/screenshot',
			description: 'Authorised endpoint - admin or the customer who owns the order.'
		},
		submittedAt: { type: 'string', format: 'date-time', nullable: true },
		verifiedAt: { type: 'string', format: 'date-time', nullable: true },
		verifiedById: { ...objectId, nullable: true },
		rejectionReason: { type: 'string', nullable: true, example: 'Transaction ID not found in the merchant statement' },
		history: { type: 'array', items: ref('PaymentHistoryEntry') },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: ['id', 'orderId', 'orderNumber', 'method', 'amount', 'status', 'hasScreenshot', 'history']
};

// ---------------------------------------------------------------------------
// reviews
// ---------------------------------------------------------------------------

const Review: TSchemaObject = {
	type: 'object',
	description: 'Customer product review. Only `approved` reviews are returned by the public endpoint.',
	properties: {
		id: objectId,
		productId: objectId,
		userId: objectId,
		customerName: { type: 'string', example: 'Ayesha Rahman' },
		orderId: { ...objectId, nullable: true },
		rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
		comment: { type: 'string', minLength: 5, maxLength: 1000, example: 'Loved the fabric quality, will buy again.' },
		status: { type: 'string', enum: enumValues(ReviewStatus), example: ReviewStatus.Pending },
		isVerifiedPurchase: {
			type: 'boolean',
			example: true,
			description: 'True when the customer has a delivered order containing this product.'
		},
		adminNote: { type: 'string', nullable: true, maxLength: 500 },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
	required: ['id', 'productId', 'userId', 'customerName', 'rating', 'comment', 'status', 'isVerifiedPurchase']
};

// ---------------------------------------------------------------------------
// delivery
// ---------------------------------------------------------------------------

const DeliveryArea: TSchemaObject = {
	type: 'object',
	properties: {
		key: {
			type: 'string',
			minLength: 2,
			example: 'inside-dhaka',
			description: 'Value to send as `deliveryArea` at checkout.'
		},
		name: { type: 'string', minLength: 2, example: 'Inside Dhaka' },
		charge: { ...money, example: 60 },
		estimatedDays: { type: 'string', nullable: true, example: '1-2 days' },
		isActive: { type: 'boolean', example: true }
	},
	required: ['key', 'name', 'charge', 'isActive']
};

const DeliverySetting: TSchemaObject = {
	type: 'object',
	description: 'Configurable delivery pricing. Unknown or inactive areas fall back to `defaultCharge`.',
	properties: {
		id: { ...objectId, nullable: true, description: 'Absent while the environment defaults are still in use.' },
		defaultCharge: { ...money, example: 130 },
		freeDeliveryEnabled: { type: 'boolean', example: true },
		freeDeliveryThreshold: {
			...money,
			example: 3000,
			description: 'Compared against the items total after discounts.'
		},
		areas: { type: 'array', items: ref('DeliveryArea') },
		note: { type: 'string', nullable: true, maxLength: 500 },
		updatedAt: { type: 'string', format: 'date-time', nullable: true }
	},
	required: ['defaultCharge', 'freeDeliveryEnabled', 'freeDeliveryThreshold', 'areas']
};

// ---------------------------------------------------------------------------
// admin dashboard
// ---------------------------------------------------------------------------

const DashboardStats: TSchemaObject = {
	type: 'object',
	properties: {
		orders: {
			type: 'object',
			properties: {
				total: { type: 'integer', example: 128 },
				pending: { type: 'integer', example: 9 },
				confirmed: { type: 'integer', example: 12 },
				processing: { type: 'integer', example: 4 },
				shipped: { type: 'integer', example: 7 },
				completed: { type: 'integer', example: 92, description: 'Delivered orders.' },
				cancelled: { type: 'integer', example: 4 }
			},
			required: ['total', 'pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled']
		},
		payments: {
			type: 'object',
			properties: {
				pendingVerification: { type: 'integer', example: 3, description: 'Payments in `submitted` state.' },
				awaitingPayment: { type: 'integer', example: 5, description: 'Payments still `pending`.' },
				verified: { type: 'integer', example: 96 }
			},
			required: ['pendingVerification', 'awaitingPayment', 'verified']
		},
		customers: {
			type: 'object',
			properties: {
				total: { type: 'integer', example: 240 },
				active: { type: 'integer', example: 236 },
				blocked: { type: 'integer', example: 4 }
			},
			required: ['total', 'active', 'blocked']
		},
		products: {
			type: 'object',
			properties: {
				total: { type: 'integer', example: 64 },
				active: { type: 'integer', example: 58 },
				lowStock: { type: 'integer', example: 6 },
				lowStockThreshold: { type: 'integer', example: 5, description: 'From LOW_STOCK_THRESHOLD.' }
			},
			required: ['total', 'active', 'lowStock', 'lowStockThreshold']
		},
		reviews: {
			type: 'object',
			properties: { pending: { type: 'integer', example: 2 } },
			required: ['pending']
		},
		revenue: {
			type: 'object',
			description: 'Only orders with a verified payment that are not cancelled are counted.',
			properties: {
				total: { ...money, example: 184500 },
				last30Days: { ...money, example: 42300 }
			},
			required: ['total', 'last30Days']
		},
		recentOrders: { type: 'array', items: ref('Order'), description: 'Five most recent orders.' },
		lowStockProducts: { type: 'array', items: ref('Product'), description: 'Ten lowest-stock active products.' }
	},
	required: ['orders', 'payments', 'customers', 'products', 'reviews', 'revenue', 'recentOrders', 'lowStockProducts']
};

export const schemas: Record<string, TSchemaObject> = {
	ErrorSource,
	ErrorResponse,
	PaginationMeta,
	Image,
	Picture,
	Address,
	User,
	AdminUser,
	AuthTokens,
	AccessToken,
	Category,
	CategorySummary,
	Specification,
	Seo,
	ProductVariant,
	Product,
	CartItem,
	Cart,
	ShippingAddress,
	CustomerSnapshot,
	ProductSnapshot,
	VariantSnapshot,
	OrderItem,
	OrderStatusHistoryEntry,
	Order,
	CheckoutSummaryItem,
	CheckoutSummary,
	PaymentInstructions,
	CreateOrderResult,
	PaymentHistoryEntry,
	Payment,
	Review,
	DeliveryArea,
	DeliverySetting,
	DashboardStats
};

/** Reused by the request schemas file. */
export const primitives = { objectId, phone, money };
