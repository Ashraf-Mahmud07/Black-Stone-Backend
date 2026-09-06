import { ProductStatus } from '../../modules/Product/product.interfaces';
import { TPathsObject, bearerAuth, listResponse, parameterRef, ref, responseRef, successResponse } from '../types';

const TAG = 'Products';

const productExample = {
	id: '6650f1a2b3c4d5e6f7a8b9c0',
	name: 'Premium Jersey Hijab',
	slug: 'premium-jersey-hijab',
	description: 'Soft premium jersey hijab with a comfortable stretch that stays in place all day.',
	shortDescription: 'Soft stretchy jersey hijab for everyday wear.',
	categoryId: '6650f1a2b3c4d5e6f7a8b9a1',
	category: { id: '6650f1a2b3c4d5e6f7a8b9a1', name: 'Hijab', slug: 'hijab' },
	images: [
		{
			url: 'https://res.cloudinary.com/demo/image/upload/v1712345678/black-stone/products/hijab-black.webp',
			key: 'upload:image:black-stone/products/hijab-black',
			isPrimary: true
		}
	],
	price: 850,
	discountPrice: 720,
	sku: 'HIJAB-JRSY01',
	variants: [
		{
			id: '6650f1a2b3c4d5e6f7a8b9d1',
			sku: 'HIJAB-JRSY01-BLK',
			color: 'Black',
			size: 'Free',
			stock: 25,
			isActive: true
		},
		{ id: '6650f1a2b3c4d5e6f7a8b9d2', sku: 'HIJAB-JRSY01-NVY', color: 'Navy', size: 'Free', stock: 18, isActive: true }
	],
	videos: [],
	specifications: [
		{ key: 'Fabric', value: 'Premium Jersey' },
		{ key: 'Size', value: '180cm x 75cm' }
	],
	stock: 43,
	status: ProductStatus.Active,
	featured: true,
	tags: ['hijab', 'jersey'],
	seo: { title: 'Premium Jersey Hijab', description: 'Soft stretchy jersey hijab.', keywords: ['hijab', 'jersey'] },
	ratingAverage: 4.7,
	ratingCount: 12,
	isDeleted: false,
	createdAt: '2026-03-01T09:00:00.000Z',
	updatedAt: '2026-03-08T14:30:00.000Z'
};

export const productPaths: TPathsObject = {
	'/api/products': {
		get: {
			tags: [TAG],
			summary: 'List products',
			description:
				'**Public.** Paginated product list with search, filtering and sorting. Only `active` products are returned; an admin token additionally exposes `draft` and `inactive` products and enables the `status` filter.',
			operationId: 'getProducts',
			security: [], // public endpoint
			parameters: [
				parameterRef('Page'),
				parameterRef('Limit'),
				{
					name: 'sortBy',
					in: 'query',
					description: 'Sort field. Unsupported values fall back to `createdAt`.',
					required: false,
					schema: {
						type: 'string',
						enum: ['createdAt', 'price', 'name', 'ratingAverage', 'stock'],
						default: 'createdAt'
					}
				},
				parameterRef('SortOrder'),
				{
					name: 'search',
					in: 'query',
					description: 'Matches name, short description, description, tags or SKU.',
					required: false,
					schema: { type: 'string' },
					example: 'jersey'
				},
				{
					name: 'category',
					in: 'query',
					description: 'Filter by category id.',
					required: false,
					schema: { type: 'string', pattern: '^[a-f\\d]{24}$' }
				},
				{
					name: 'categorySlug',
					in: 'query',
					description: 'Filter by category slug. An unknown slug returns an empty list.',
					required: false,
					schema: { type: 'string' },
					example: 'hijab'
				},
				{
					name: 'minPrice',
					in: 'query',
					description: 'Minimum price (BDT).',
					required: false,
					schema: { type: 'number', minimum: 0 }
				},
				{
					name: 'maxPrice',
					in: 'query',
					description: 'Maximum price (BDT).',
					required: false,
					schema: { type: 'number', minimum: 0 }
				},
				{
					name: 'featured',
					in: 'query',
					description: 'Filter featured products.',
					required: false,
					schema: { type: 'string', enum: ['true', 'false'] }
				},
				{
					name: 'inStock',
					in: 'query',
					description: 'When `true`, only products with stock greater than 0.',
					required: false,
					schema: { type: 'string', enum: ['true', 'false'] }
				},
				{
					name: 'tags',
					in: 'query',
					description: 'Comma separated tag list.',
					required: false,
					schema: { type: 'string' },
					example: 'hijab,jersey'
				},
				{
					name: 'status',
					in: 'query',
					description: 'Admin only. Ignored for public requests.',
					required: false,
					schema: { type: 'string', enum: Object.values(ProductStatus) }
				}
			],
			responses: {
				'200': {
					...listResponse('Products retrieved successfully!', ref('Product')),
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									success: { type: 'boolean', example: true },
									message: { type: 'string', example: 'Products retrieved successfully!' },
									meta: ref('PaginationMeta'),
									data: { type: 'array', items: ref('Product') }
								},
								required: ['success', 'message', 'data']
							},
							example: {
								success: true,
								message: 'Products retrieved successfully!',
								meta: { page: 1, limit: 10, total: 3, totalPage: 1 },
								data: [productExample]
							}
						}
					}
				},
				'500': responseRef('ServerError')
			}
		},
		post: {
			tags: [TAG],
			summary: 'Create a product',
			description:
				'**Admin.** `slug` and `sku` are generated when omitted. When `variants` are supplied the total stock is derived from them. The category must exist and be active, and `discountPrice` must be lower than `price`.',
			operationId: 'createProduct',
			security: bearerAuth,
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('CreateProductRequest'),
						example: {
							name: 'Premium Jersey Hijab',
							description: 'Soft premium jersey hijab with a comfortable stretch that stays in place all day.',
							shortDescription: 'Soft stretchy jersey hijab for everyday wear.',
							categoryId: '6650f1a2b3c4d5e6f7a8b9a1',
							price: 850,
							discountPrice: 720,
							status: ProductStatus.Active,
							featured: true,
							tags: ['hijab', 'jersey'],
							specifications: [{ key: 'Fabric', value: 'Premium Jersey' }],
							variants: [
								{ sku: 'HIJAB-JRSY01-BLK', color: 'Black', size: 'Free', stock: 25 },
								{ sku: 'HIJAB-JRSY01-NVY', color: 'Navy', size: 'Free', stock: 18 }
							],
							seo: { title: 'Premium Jersey Hijab', keywords: ['hijab', 'jersey'] }
						}
					}
				}
			},
			responses: {
				'201': successResponse('Product created successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': {
					description: 'Category not found.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'409': {
					description: 'A product with this SKU already exists.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/id/{id}': {
		get: {
			tags: [TAG],
			summary: 'Get a product by id',
			description: '**Public.** Non-active products return 404 unless the request carries an admin token.',
			operationId: 'getProductById',
			security: [], // public endpoint
			parameters: [parameterRef('IdParam')],
			responses: {
				'200': successResponse('Product retrieved successfully!', ref('Product'), {
					example: { success: true, message: 'Product retrieved successfully!', data: productExample }
				}),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	// GET uses the slug, PATCH/DELETE use the id. They share one path template because
	// OpenAPI does not allow two templated paths at the same position.
	'/api/products/{slugOrId}': {
		get: {
			tags: [TAG],
			summary: 'Get a product by slug',
			description:
				'**Public.** Product detail page endpoint. Includes variants, specifications, images and rating aggregates. Non-active products return 404 unless the request carries an admin token.',
			operationId: 'getProductBySlug',
			security: [],
			parameters: [
				{
					name: 'slugOrId',
					in: 'path',
					description: 'Product **slug**.',
					required: true,
					schema: { type: 'string', example: 'premium-jersey-hijab' }
				}
			],
			responses: {
				'200': successResponse('Product retrieved successfully!', ref('Product'), {
					example: { success: true, message: 'Product retrieved successfully!', data: productExample }
				}),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		patch: {
			tags: [TAG],
			summary: 'Update a product',
			description:
				'**Admin.** Variants are managed through the variant endpoints; `stock` is ignored for products that have variants. Renaming regenerates the slug.',
			operationId: 'updateProduct',
			security: bearerAuth,
			parameters: [parameterRef('SlugOrIdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateProductRequest'),
						example: { price: 900, discountPrice: 780, featured: true, status: ProductStatus.Active }
					}
				}
			},
			responses: {
				'200': successResponse('Product updated successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'409': {
					description: 'A product with this SKU already exists.',
					content: { 'application/json': { schema: ref('ErrorResponse') } }
				},
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Delete a product',
			description:
				'**Admin.** Soft delete: the product is marked deleted and set to `inactive` so historical orders keep resolving. It disappears from every listing.',
			operationId: 'deleteProduct',
			security: bearerAuth,
			parameters: [parameterRef('SlugOrIdParam')],
			responses: {
				'200': successResponse('Product deleted successfully!', ref('Product')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/{id}/stock': {
		patch: {
			tags: [TAG, 'Admin'],
			summary: 'Set product or variant stock',
			description:
				'**Admin.** Sets an absolute stock value. `variantId` is required when the product has variants; the product total is recalculated from its variants.',
			operationId: 'updateProductStock',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('UpdateStockRequest'),
						example: { stock: 30, variantId: '6650f1a2b3c4d5e6f7a8b9d1' }
					}
				}
			},
			responses: {
				'200': successResponse('Stock updated successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/{id}/variants': {
		post: {
			tags: [TAG],
			summary: 'Add a variant',
			description:
				'**Admin.** Variant SKUs must be unique within the product. The product stock becomes the sum of its variants.',
			operationId: 'addProductVariant',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('VariantRequest'),
						example: { sku: 'HIJAB-JRSY01-BEG', color: 'Beige', size: 'Free', stock: 12 }
					}
				}
			},
			responses: {
				'201': successResponse('Variant added successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/{id}/variants/{variantId}': {
		patch: {
			tags: [TAG],
			summary: 'Update a variant',
			description: '**Admin.** Partial update of one variant. Changing the stock updates the product total.',
			operationId: 'updateProductVariant',
			security: bearerAuth,
			parameters: [parameterRef('IdParam'), parameterRef('VariantIdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': { schema: ref('UpdateVariantRequest'), example: { stock: 8, isActive: true } }
				}
			},
			responses: {
				'200': successResponse('Variant updated successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Remove a variant',
			description:
				'**Admin.** Removes the variant and recalculates the product stock. Existing orders keep their variant snapshot.',
			operationId: 'removeProductVariant',
			security: bearerAuth,
			parameters: [parameterRef('IdParam'), parameterRef('VariantIdParam')],
			responses: {
				'200': successResponse('Variant removed successfully!', ref('Product')),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/{id}/videos': {
		post: {
			tags: [TAG],
			summary: 'Upload product videos',
			description:
				'**Admin.** `multipart/form-data` upload of up to 3 videos (MP4, WEBM, MOV, max 50MB each). Files are uploaded to Cloudinary, which also returns a poster frame as `thumbnailUrl` together with `width`, `height` and `duration`.',
			operationId: 'addProductVideos',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: ref('ProductVideosUpload'),
						encoding: { videos: { contentType: 'video/mp4, video/webm, video/quicktime' } }
					}
				}
			},
			responses: {
				'200': successResponse('Product videos uploaded successfully!', ref('Product')),
				'400': {
					description: 'No file supplied, unsupported file type, file too large, or the 3 video limit reached.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'Only MP4, WEBM and MOV videos are allowed!',
								errorSources: [{ path: '', message: 'Only MP4, WEBM and MOV videos are allowed!' }]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Remove a product video',
			description: '**Admin.** Removes the video from the product and deletes the stored file.',
			operationId: 'removeProductVideo',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('RemoveProductVideoRequest'),
						example: { url: 'https://res.cloudinary.com/demo/video/upload/black-stone/products/clip.mp4' }
					}
				}
			},
			responses: {
				'200': successResponse('Product video removed successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	},

	'/api/products/{id}/images': {
		post: {
			tags: [TAG],
			summary: 'Upload product images',
			description:
				'**Admin.** `multipart/form-data` upload of up to 8 images (JPEG, PNG, WEBP, max 5MB each). The first image of an empty gallery becomes the primary image. Files are uploaded to Cloudinary and the response carries the secure CDN url.',
			operationId: 'addProductImages',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: ref('ProductImagesUpload'),
						encoding: { images: { contentType: 'image/jpeg, image/png, image/webp' } }
					}
				}
			},
			responses: {
				'200': successResponse('Product images uploaded successfully!', ref('Product')),
				'400': {
					description: 'No file supplied, unsupported file type or file too large.',
					content: {
						'application/json': {
							schema: ref('ErrorResponse'),
							example: {
								success: false,
								message: 'Only JPEG, PNG and WEBP images are allowed!',
								errorSources: [{ path: '', message: 'Only JPEG, PNG and WEBP images are allowed!' }]
							}
						}
					}
				},
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		},
		delete: {
			tags: [TAG],
			summary: 'Remove a product image',
			description: '**Admin.** Removes the image from the product and deletes the stored file.',
			operationId: 'removeProductImage',
			security: bearerAuth,
			parameters: [parameterRef('IdParam')],
			requestBody: {
				required: true,
				content: {
					'application/json': {
						schema: ref('RemoveProductImageRequest'),
						example: {
							url: 'https://res.cloudinary.com/demo/image/upload/v1712345678/black-stone/products/hijab-black.webp'
						}
					}
				}
			},
			responses: {
				'200': successResponse('Product image removed successfully!', ref('Product')),
				'400': responseRef('BadRequest'),
				'401': responseRef('Unauthorized'),
				'403': responseRef('Forbidden'),
				'404': responseRef('NotFound'),
				'500': responseRef('ServerError')
			}
		}
	}
};
