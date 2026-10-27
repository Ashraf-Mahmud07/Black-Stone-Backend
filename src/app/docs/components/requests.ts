import { UserRole } from '../../interface/auth';
import { DeliveryArea } from '../../modules/Delivery/delivery.interfaces';
import { OrderStatus, PaymentMethod } from '../../modules/Order/order.interfaces';
import { ProductStatus } from '../../modules/Product/product.interfaces';
import { ReviewStatus } from '../../modules/Review/review.interfaces';
import { Status as UserStatus } from '../../modules/User/user.interfaces';
import { TSchemaObject, ref } from '../types';
import { primitives } from './schemas';

/**
 * Request body schemas. Every constraint mirrors the zod validation schema of the
 * corresponding module, so the spec is a reliable contract for the frontend.
 */

const { objectId, phone, money } = primitives;
const enumValues = (source: Record<string, string>): string[] => Object.values(source);

const password: TSchemaObject = {
	type: 'string',
	minLength: 8,
	description: 'At least 8 characters, containing at least one letter and one number.',
	example: 'Customer1234'
};

const imageInput: TSchemaObject = {
	type: 'object',
	properties: {
		url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/products/hijab-black.png' },
		key: { type: 'string', example: 'upload:image:black-stone/products/hijab-black' },
		alt: { type: 'string', example: 'Black jersey hijab' }
	},
	required: ['url']
};

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

const RegisterRequest: TSchemaObject = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 2, example: 'Ayesha Rahman' },
		username: { type: 'string', minLength: 3, example: 'ayesha' },
		email: { type: 'string', format: 'email', example: 'ayesha@example.com' },
		phone,
		password
	},
	required: ['name', 'email', 'password']
};

const LoginRequest: TSchemaObject = {
	type: 'object',
	properties: {
		email: { type: 'string', format: 'email', example: 'ayesha@example.com' },
		password: { type: 'string', minLength: 1, example: 'Customer1234' }
	},
	required: ['email', 'password']
};

const RefreshTokenRequest: TSchemaObject = {
	type: 'object',
	description: 'Optional body. When omitted, the httpOnly `refreshToken` cookie is used.',
	properties: {
		refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<signature>' }
	}
};

const ChangePasswordRequest: TSchemaObject = {
	type: 'object',
	properties: {
		oldPassword: { type: 'string', example: 'Customer1234' },
		newPassword: password
	},
	required: ['oldPassword', 'newPassword']
};

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

const UpdateProfileRequest: TSchemaObject = {
	type: 'object',
	description: 'All fields optional. Email, role, password and status cannot be changed here.',
	properties: {
		username: { type: 'string', minLength: 3, example: 'ayesha' },
		name: { type: 'string', minLength: 2, example: 'Ayesha Rahman' },
		phone,
		location: { type: 'string', example: 'Dhaka' },
		picture: ref('Picture'),
		addresses: { type: 'array', items: ref('Address') }
	}
};

const ChangeUserStatusRequest: TSchemaObject = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: enumValues(UserStatus), example: UserStatus.Blocked }
	},
	required: ['status']
};

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

const CreateCategoryRequest: TSchemaObject = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 2, example: 'Three-Piece' },
		slug: { type: 'string', description: 'Generated from the name when omitted.', example: 'three-piece' },
		description: { type: 'string', maxLength: 1000, example: 'Ready to wear three piece sets.' },
		image: imageInput,
		sortOrder: { type: 'integer', minimum: 0, example: 3 },
		isActive: { type: 'boolean', default: true, example: true }
	},
	required: ['name']
};

const UpdateCategoryRequest: TSchemaObject = { ...CreateCategoryRequest, required: [] };

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------

const VariantRequest: TSchemaObject = {
	type: 'object',
	properties: {
		sku: { type: 'string', minLength: 2, example: 'HIJAB-JRSY01-BLK', description: 'Unique within the product.' },
		color: { type: 'string', example: 'Black' },
		size: { type: 'string', example: 'Free' },
		design: { type: 'string', example: 'Plain' },
		attributes: { type: 'object', additionalProperties: { type: 'string' }, example: { fabric: 'Jersey' } },
		price: { ...money, description: 'Overrides the product price for this variant.' },
		discountPrice: { ...money, description: 'Must be lower than the variant price.' },
		stock: { type: 'integer', minimum: 0, example: 25 },
		image: imageInput,
		isActive: { type: 'boolean', default: true }
	},
	required: ['sku', 'stock']
};

const CreateProductRequest: TSchemaObject = {
	type: 'object',
	description:
		'When `variants` are supplied, `stock` is derived from them and the top level `stock` value is ignored. `slug` and `sku` are generated when omitted.',
	properties: {
		name: { type: 'string', minLength: 2, example: 'Premium Jersey Hijab' },
		slug: { type: 'string', example: 'premium-jersey-hijab' },
		description: { type: 'string', minLength: 10, example: 'Soft premium jersey hijab with a comfortable stretch.' },
		shortDescription: { type: 'string', maxLength: 300, example: 'Soft stretchy jersey hijab for everyday wear.' },
		categoryId: objectId,
		images: { type: 'array', items: imageInput },
		price: { type: 'number', minimum: 0, example: 850, description: 'Must be greater than 0.' },
		discountPrice: { ...money, example: 720, description: 'Must be lower than `price`.' },
		sku: { type: 'string', minLength: 2, example: 'HIJAB-JRSY01' },
		variants: { type: 'array', items: ref('VariantRequest') },
		specifications: { type: 'array', items: ref('Specification') },
		stock: { type: 'integer', minimum: 0, example: 20, description: 'Only used for products without variants.' },
		status: { type: 'string', enum: enumValues(ProductStatus), default: ProductStatus.Draft },
		featured: { type: 'boolean', default: false },
		tags: { type: 'array', items: { type: 'string' }, example: ['hijab', 'jersey'] },
		seo: ref('Seo')
	},
	required: ['name', 'description', 'categoryId', 'price']
};

const UpdateProductRequest: TSchemaObject = {
	type: 'object',
	description: 'All fields optional. Variants are managed through the dedicated variant endpoints.',
	properties: {
		name: { type: 'string', minLength: 2 },
		slug: { type: 'string' },
		description: { type: 'string', minLength: 10 },
		shortDescription: { type: 'string', maxLength: 300 },
		categoryId: objectId,
		images: { type: 'array', items: imageInput },
		price: { type: 'number', minimum: 0 },
		discountPrice: money,
		sku: { type: 'string', minLength: 2 },
		specifications: { type: 'array', items: ref('Specification') },
		stock: { type: 'integer', minimum: 0, description: 'Ignored when the product has variants.' },
		status: { type: 'string', enum: enumValues(ProductStatus), example: ProductStatus.Active },
		featured: { type: 'boolean', example: true },
		tags: { type: 'array', items: { type: 'string' } },
		seo: ref('Seo')
	}
};

const UpdateVariantRequest: TSchemaObject = { ...VariantRequest, required: [] };

const UpdateStockRequest: TSchemaObject = {
	type: 'object',
	description: 'Sets an absolute stock value. `variantId` is required for products that have variants.',
	properties: {
		stock: { type: 'integer', minimum: 0, example: 30 },
		variantId: objectId
	},
	required: ['stock']
};

const RemoveProductImageRequest: TSchemaObject = {
	type: 'object',
	properties: {
		url: {
			type: 'string',
			format: 'uri',
			example: 'https://res.cloudinary.com/demo/image/upload/v1712345678/black-stone/products/hijab-black.webp'
		}
	},
	required: ['url']
};

const ProductImagesUpload: TSchemaObject = {
	type: 'object',
	properties: {
		images: {
			type: 'array',
			maxItems: 16,
			items: { type: 'string', format: 'binary' },
			description: 'JPEG, PNG or WEBP. Maximum 5MB per file (MAX_UPLOAD_SIZE_MB), up to 12 images per product.'
		}
	},
	required: ['images']
};

// ---------------------------------------------------------------------------
// cart
// ---------------------------------------------------------------------------

const VariantImagesUpload: TSchemaObject = {
	type: 'object',
	properties: {
		images: {
			type: 'array',
			maxItems: 6,
			items: { type: 'string', format: 'binary' },
			description: 'JPEG, PNG or WEBP. Maximum 5MB per file, up to 6 images per variant.'
		}
	},
	required: ['images']
};

const ProductVideosUpload: TSchemaObject = {
	type: 'object',
	properties: {
		videos: {
			type: 'array',
			maxItems: 16,
			items: { type: 'string', format: 'binary' },
			description: 'MP4, WEBM or MOV. Maximum 50MB per file (MAX_VIDEO_UPLOAD_SIZE_MB), up to 12 videos per product.'
		}
	},
	required: ['videos']
};

const RemoveProductVideoRequest: TSchemaObject = {
	type: 'object',
	properties: {
		url: {
			type: 'string',
			format: 'uri',
			example: 'https://res.cloudinary.com/demo/video/upload/black-stone/products/clip.mp4'
		}
	},
	required: ['url']
};

const AddCartItemRequest: TSchemaObject = {
	type: 'object',
	description: '`variantId` is required when the product has variants. Maximum 50 units per line.',
	properties: {
		productId: objectId,
		variantId: objectId,
		quantity: { type: 'integer', minimum: 1, example: 2 }
	},
	required: ['productId', 'quantity']
};

const UpdateCartItemRequest: TSchemaObject = {
	type: 'object',
	description: 'Replaces the quantity of one cart line.',
	properties: {
		productId: objectId,
		variantId: objectId,
		quantity: { type: 'integer', minimum: 1, example: 3 }
	},
	required: ['productId', 'quantity']
};

const RemoveCartItemRequest: TSchemaObject = {
	type: 'object',
	properties: { productId: objectId, variantId: objectId },
	required: ['productId']
};

// ---------------------------------------------------------------------------
// checkout / orders
// ---------------------------------------------------------------------------

const CheckoutItemInput: TSchemaObject = {
	type: 'object',
	properties: {
		productId: objectId,
		variantId: objectId,
		quantity: { type: 'integer', minimum: 1, example: 1 }
	},
	required: ['productId', 'quantity']
};

const CheckoutPreviewRequest: TSchemaObject = {
	type: 'object',
	description:
		'Use `source: "cart"` (logged-in customers) or send `items` for Buy Now and guest checkout. When a logged-in customer sends neither, the cart is used.',
	properties: {
		source: { type: 'string', enum: ['cart', 'direct'], example: 'direct' },
		items: { type: 'array', minItems: 1, items: ref('CheckoutItemInput') },
		deliveryArea: {
			type: 'string',
			enum: enumValues(DeliveryArea),
			example: DeliveryArea.InsideDhaka,
			description: 'Optional here - the preview falls back to the default charge until an area is chosen.'
		}
	}
};

const CreateOrderRequest: TSchemaObject = {
	type: 'object',
	description:
		'Checkout collects exactly four things: name, mobile number, full address and delivery area. Prices, discounts, delivery charge and totals are always recalculated server side, and the order is always stored as cash on delivery. Send an `Idempotency-Key` header to make a retry safe.',
	properties: {
		source: { type: 'string', enum: ['cart', 'direct'], example: 'cart' },
		items: {
			type: 'array',
			minItems: 1,
			maxItems: 50,
			items: ref('CheckoutItemInput'),
			description: 'Required for Buy Now and guest checkout.'
		},
		customer: {
			type: 'object',
			properties: {
				name: { type: 'string', minLength: 2, example: 'Ayesha Rahman' },
				phone,
				email: { type: 'string', format: 'email', example: 'ayesha@example.com' }
			},
			required: ['name', 'phone']
		},
		shippingAddress: ref('ShippingAddressInput'),
		deliveryArea: {
			type: 'string',
			enum: enumValues(DeliveryArea),
			example: DeliveryArea.InsideDhaka,
			description: 'Required. Drives the delivery charge; any other value is rejected with 400.'
		},
		paymentMethod: {
			type: 'string',
			enum: enumValues(PaymentMethod),
			description:
				'Accepted for backwards compatibility and then ignored - every order is stored as `cod`. Kept so online payment can be re-enabled without a migration.',
			example: PaymentMethod.CashOnDelivery
		},
		expectedTotal: {
			...money,
			description:
				'Optional. The total the client displayed. It is compared against the server total and a mismatch is logged, never charged - the order still succeeds at the server price.',
			example: 1500
		},
		customerNotes: {
			type: 'string',
			maxLength: 500,
			description: 'Deprecated: checkout no longer collects notes. Still stored when sent.',
			example: 'Gift wrap please'
		}
	},
	required: ['customer', 'shippingAddress', 'deliveryArea']
};

const ShippingAddressInput: TSchemaObject = {
	type: 'object',
	description:
		'Only `address` is required. `name` and `phone` are copied from `customer` when omitted, so checkout never collects them twice.',
	properties: {
		name: { type: 'string', minLength: 2, example: 'Ayesha Rahman' },
		phone,
		email: { type: 'string', format: 'email', example: 'ayesha@example.com' },
		address: {
			type: 'string',
			minLength: 5,
			description: 'Full delivery address as a single line.',
			example: 'House 12, Road 4, Dhanmondi, Dhaka 1209'
		},
		deliveryNotes: { type: 'string', maxLength: 500, example: 'Call before delivery' }
	},
	required: ['address']
};

const TrackOrderRequest: TSchemaObject = {
	type: 'object',
	properties: {
		orderNumber: { type: 'string', minLength: 4, example: 'BS-260309-A1B2C3' },
		phone
	},
	required: ['orderNumber', 'phone']
};

const UpdateOrderStatusRequest: TSchemaObject = {
	type: 'object',
	description:
		'Allowed transitions: pending → confirmed → processing → shipped → delivered, and pending/confirmed/processing → cancelled.',
	properties: {
		status: { type: 'string', enum: enumValues(OrderStatus), example: OrderStatus.Confirmed },
		note: { type: 'string', maxLength: 500, example: 'Confirmed over phone' }
	},
	required: ['status']
};

const CancelOrderRequest: TSchemaObject = {
	type: 'object',
	properties: { reason: { type: 'string', maxLength: 500, example: 'Ordered the wrong colour' } }
};

const AdjustOrderPricingRequest: TSchemaObject = {
	type: 'object',
	description:
		'Every field is optional, but at least one of `manualDiscount`, `deliveryCharge` or `resetDelivery` must be sent. Any other property - including `total`, `subtotal` or `discount` - is rejected with 400: totals are always recalculated on the server.',
	properties: {
		manualDiscount: {
			...money,
			example: 250,
			description: 'Absolute BDT off, on top of the item discount. Send 0 to clear it.'
		},
		deliveryCharge: {
			...money,
			example: 0,
			description: 'Delivery charge for this order only. Marks the charge as overridden.'
		},
		resetDelivery: {
			type: 'boolean',
			example: true,
			description: 'Drops the override and re-resolves the charge from the delivery area settings.'
		},
		note: { type: 'string', maxLength: 500, example: 'Negotiated over phone' }
	}
};

const AdminNotesRequest: TSchemaObject = {
	type: 'object',
	properties: {
		adminNotes: { type: 'string', maxLength: 1000, example: 'Customer requested evening delivery' }
	},
	required: ['adminNotes']
};

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------

const SubmitPaymentUpload: TSchemaObject = {
	type: 'object',
	description: 'Sent as multipart/form-data. Only bKash and Nagad orders accept a transaction ID.',
	properties: {
		transactionId: {
			type: 'string',
			minLength: 6,
			maxLength: 40,
			example: 'TRX9AB12CD34',
			description: 'Stored uppercase, must not already be used by another order.'
		},
		senderNumber: { ...phone, description: 'Wallet number the money was sent from.' },
		phone: { ...phone, description: 'Required for guest orders - must match the order phone number.' },
		screenshot: {
			type: 'string',
			format: 'binary',
			description: 'Optional payment screenshot. JPEG, PNG or WEBP, maximum 5MB.'
		}
	},
	required: ['transactionId']
};

const VerifyPaymentRequest: TSchemaObject = {
	type: 'object',
	properties: { note: { type: 'string', maxLength: 500, example: 'Matched with the merchant statement' } }
};

const RejectPaymentRequest: TSchemaObject = {
	type: 'object',
	properties: {
		rejectionReason: {
			type: 'string',
			minLength: 5,
			maxLength: 500,
			example: 'Transaction ID not found in the merchant statement'
		}
	},
	required: ['rejectionReason']
};

const RefundPaymentRequest: TSchemaObject = {
	type: 'object',
	properties: { note: { type: 'string', maxLength: 500, example: 'Refunded via bKash on 09 Mar' } }
};

// ---------------------------------------------------------------------------
// reviews
// ---------------------------------------------------------------------------

const CreateReviewRequest: TSchemaObject = {
	type: 'object',
	properties: {
		productId: objectId,
		orderId: objectId,
		rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
		comment: { type: 'string', minLength: 5, maxLength: 1000, example: 'Loved the fabric quality, will buy again.' }
	},
	required: ['productId', 'rating', 'comment']
};

const UpdateReviewRequest: TSchemaObject = {
	type: 'object',
	properties: {
		rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
		comment: { type: 'string', minLength: 5, maxLength: 1000, example: 'Still good after several washes.' }
	}
};

const ModerateReviewRequest: TSchemaObject = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: enumValues(ReviewStatus), example: ReviewStatus.Approved },
		adminNote: { type: 'string', maxLength: 500, example: 'Genuine purchase, approved.' }
	},
	required: ['status']
};

// ---------------------------------------------------------------------------
// delivery
// ---------------------------------------------------------------------------

const UpdateDeliverySettingRequest: TSchemaObject = {
	type: 'object',
	description: 'Partial update. Area keys must be unique; a threshold is required when free delivery is enabled.',
	properties: {
		defaultCharge: { ...money, example: 130 },
		freeDeliveryEnabled: { type: 'boolean', example: true },
		freeDeliveryThreshold: { ...money, example: 3000 },
		areas: { type: 'array', items: ref('DeliveryArea') },
		note: { type: 'string', maxLength: 500, example: 'Delivery charges are collected with the order total.' }
	}
};

// ---------------------------------------------------------------------------
// system
// ---------------------------------------------------------------------------

const MailToCompanyRequest: TSchemaObject = {
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 3, example: 'Ayesha Rahman' },
		mobile: { type: 'string', minLength: 11, example: '01712345678' },
		actual_amount: { type: 'number', minimum: 0, example: 50000, description: 'Must be greater than 0.' },
		due_amount: { type: 'number', minimum: 0, example: 15000, description: 'Must be greater than 0.' },
		reference: { type: 'string', minLength: 1, example: 'REF-2026-014' },
		investment_type: { type: 'string', enum: ['ips', 'share'], example: 'ips' }
	},
	required: ['name', 'mobile', 'actual_amount', 'due_amount', 'reference', 'investment_type']
};

export const requestSchemas: Record<string, TSchemaObject> = {
	RegisterRequest,
	LoginRequest,
	RefreshTokenRequest,
	ChangePasswordRequest,
	UpdateProfileRequest,
	ChangeUserStatusRequest,
	CreateCategoryRequest,
	UpdateCategoryRequest,
	VariantRequest,
	UpdateVariantRequest,
	CreateProductRequest,
	UpdateProductRequest,
	UpdateStockRequest,
	RemoveProductImageRequest,
	ProductImagesUpload,
	ProductVideosUpload,
	VariantImagesUpload,
	RemoveProductVideoRequest,
	AddCartItemRequest,
	UpdateCartItemRequest,
	RemoveCartItemRequest,
	CheckoutItemInput,
	CheckoutPreviewRequest,
	CreateOrderRequest,
	ShippingAddressInput,
	TrackOrderRequest,
	UpdateOrderStatusRequest,
	CancelOrderRequest,
	AdminNotesRequest,
	AdjustOrderPricingRequest,
	SubmitPaymentUpload,
	VerifyPaymentRequest,
	RejectPaymentRequest,
	RefundPaymentRequest,
	CreateReviewRequest,
	UpdateReviewRequest,
	ModerateReviewRequest,
	UpdateDeliverySettingRequest,
	MailToCompanyRequest
};

/** Roles referenced in endpoint descriptions. */
export const roles = UserRole;
