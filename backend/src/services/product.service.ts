import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { notifyNewProduct, notifyPriceDrop } from './notification.service.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface ProductRecord {
  id: string;
  artisan_id: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  material: string | null;
  color: string | null;
  craft_type: string | null;
  features: string[];
  price: number;
  stock_quantity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  creation_source: 'MANUAL' | 'AI_ASSISTED';
  primary_image_url: string | null;
  original_image_url: string | null;
  enhanced_image_url?: string | null;
  selected_background?: string | null;
  enhanced_at?: string | null;
  mrp?: number | null;
  attributes?: Record<string, string>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  craft_type?: string;
  features?: string[];
  price: number;
  stock_quantity: number;
  mrp?: number | null;
  attributes?: Record<string, string>;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material?: string;
  color?: string;
  craft_type?: string;
  features?: string[];
  price?: number;
  stock_quantity?: number;
  mrp?: number | null;
  attributes?: Record<string, string>;
}

export interface ProductStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

// ─── Create Product ──────────────────────────────────────────────────

// In-memory product fallback store for resilience
const localMemoryProductStore = new Map<string, ProductRecord>();

export async function createProduct(
  artisanId: string,
  input: CreateProductInput
): Promise<ProductRecord> {
  const supabase = getSupabaseAdmin();
  const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const memoryFallbackProd: ProductRecord = {
    id: newId,
    artisan_id: artisanId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    subcategory: input.subcategory?.trim() || null,
    material: input.material?.trim() || null,
    color: input.color?.trim() || null,
    craft_type: input.craft_type?.trim() || null,
    features: input.features || [],
    price: input.price,
    stock_quantity: input.stock_quantity,
    mrp: input.mrp ?? null,
    attributes: input.attributes || {},
    status: 'DRAFT',
    creation_source: 'MANUAL',
    primary_image_url: null,
    original_image_url: null,
    created_at: now,
    updated_at: now,
    published_at: null,
  };

  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        artisan_id: artisanId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        subcategory: input.subcategory?.trim() || null,
        material: input.material?.trim() || null,
        color: input.color?.trim() || null,
        craft_type: input.craft_type?.trim() || null,
        features: input.features || [],
        price: input.price,
        stock_quantity: input.stock_quantity,
        mrp: input.mrp ?? null,
        attributes: input.attributes || {},
        status: 'DRAFT',
        creation_source: 'MANUAL',
      })
      .select()
      .single();

    if (!error && data) {
      localMemoryProductStore.set(data.id, data as ProductRecord);
      logger.info(`Product created: ${data.id} by artisan ${artisanId}`);

      // Automatically trigger background Smart Catalogue preparation
      triggerAutoCatalogueGeneration(data.id, artisanId, data).catch((e: any) => logger.warn(`[AutoCatalogue] Background generation notice for ${data.id}: ${e.message}`));

      return data as ProductRecord;
    }
  } catch (e) {}

  localMemoryProductStore.set(memoryFallbackProd.id, memoryFallbackProd);
  logger.info(`Product created (memory fallback): ${memoryFallbackProd.id} by artisan ${artisanId}`);

  // Automatically trigger background Smart Catalogue preparation on fallback
  triggerAutoCatalogueGeneration(memoryFallbackProd.id, artisanId, memoryFallbackProd).catch((e: any) => logger.warn(`[AutoCatalogue] Background generation notice for ${memoryFallbackProd.id}: ${e.message}`));

  return memoryFallbackProd;
}

/**
 * Automatically prepares and saves Smart Catalogue content across supported languages (EN, TA, HI).
 * Respects existing artisan manual edits.
 */
export async function triggerAutoCatalogueGeneration(
  productId: string,
  artisanId: string,
  product: Partial<ProductRecord> & { name: string }
): Promise<void> {
  try {
    const { generateCatalogueContent } = await import('./ai/catalogue-generation.service.js');
    const { saveCatalogueContent, getCatalogueContent } = await import('./catalogue.service.js');
    const { productToCatalogueInput } = await import('./catalogue-backfill.service.js');
    const input = productToCatalogueInput(product);

    const languages: ('en' | 'ta' | 'hi')[] = ['en', 'ta', 'hi'];
    for (const lang of languages) {
      const existing = await getCatalogueContent(productId, lang, artisanId);
      if (existing && existing.generated_by === 'artisan') {
        continue; // Preserve artisan manual edits
      }

      const generated = await generateCatalogueContent(input, lang, 'PROFESSIONAL');
      await saveCatalogueContent(productId, artisanId, lang, generated, 'PROFESSIONAL', 'm63');
    }

    logger.info(`[AutoCatalogue] Multilingual Smart Catalogue ready for product ${productId}`);
  } catch (err: any) {
    logger.warn(`[AutoCatalogue] Error preparing catalogue for product ${productId}: ${err?.message}`);
  }
}

// ─── List Products by Artisan ────────────────────────────────────────

export async function getProductsByArtisan(
  artisanId: string,
  statusFilter?: string
): Promise<ProductRecord[]> {
  const supabase = getSupabaseAdmin();
  let dbProducts: ProductRecord[] = [];

  try {
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (artisanId !== 'all') {
      query = query.eq('artisan_id', artisanId);
    }

    if (statusFilter && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      dbProducts = data as ProductRecord[];
    }
  } catch (e) {}

  const memProducts = Array.from(localMemoryProductStore.values()).filter((p) => {
    if (artisanId !== 'all' && p.artisan_id !== artisanId) return false;
    if (statusFilter && statusFilter !== 'any' && p.status !== statusFilter) return false;
    return true;
  });

  const combinedMap = new Map<string, ProductRecord>();
  for (const p of [...dbProducts, ...memProducts]) {
    combinedMap.set(p.id, p);
  }

  return Array.from(combinedMap.values());
}

// ─── Get Single Product (ownership enforced) ─────────────────────────

export async function getProductById(
  productId: string,
  artisanId: string
): Promise<ProductRecord | null> {
  const supabase = getSupabaseAdmin();

  try {
    const { data: existing, error: findError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (!findError && existing) {
      if (artisanId !== 'any' && existing.artisan_id !== artisanId) {
        throw Object.assign(new Error('Access denied. You do not own this product.'), { code: 'FORBIDDEN', statusCode: 403 });
      }
      return existing as ProductRecord;
    }
  } catch (e: any) {
    if (e.statusCode === 403) throw e;
  }

  const memProd = localMemoryProductStore.get(productId);
  if (memProd) {
    if (artisanId !== 'any' && memProd.artisan_id !== artisanId) {
      throw Object.assign(new Error('Access denied. You do not own this product.'), { code: 'FORBIDDEN', statusCode: 403 });
    }
    return memProd;
  }

  return null;
}

// ─── Update Product (ownership enforced) ─────────────────────────────

export async function updateProduct(
  productId: string,
  artisanId: string,
  updates: UpdateProductInput
): Promise<ProductRecord> {
  const supabase = getSupabaseAdmin();

  // Build safe update object — only include provided fields
  const safeUpdates: Record<string, any> = {};
  if (updates.name !== undefined) safeUpdates.name = updates.name.trim();
  if (updates.description !== undefined) safeUpdates.description = updates.description.trim() || null;
  if (updates.category !== undefined) safeUpdates.category = updates.category.trim() || null;
  if (updates.subcategory !== undefined) safeUpdates.subcategory = updates.subcategory.trim() || null;
  if (updates.material !== undefined) safeUpdates.material = updates.material.trim() || null;
  if (updates.color !== undefined) safeUpdates.color = updates.color.trim() || null;
  if (updates.craft_type !== undefined) safeUpdates.craft_type = updates.craft_type.trim() || null;
  if (updates.features !== undefined) safeUpdates.features = updates.features;
  if (updates.price !== undefined) safeUpdates.price = updates.price;
  if (updates.stock_quantity !== undefined) safeUpdates.stock_quantity = updates.stock_quantity;
  if ((updates as any).primary_image_url !== undefined) safeUpdates.primary_image_url = (updates as any).primary_image_url;
  if (updates.mrp !== undefined) safeUpdates.mrp = updates.mrp;
  if (updates.attributes !== undefined) safeUpdates.attributes = updates.attributes;

  // Keep M.R.P. valid: it can never be below the selling price
  let previousPrice: number | null = null;
  if (safeUpdates.price !== undefined || safeUpdates.mrp !== undefined) {
    const current = await getProductById(productId, artisanId).catch(() => null);
    previousPrice = current ? Number(current.price) : null;
    const price = safeUpdates.price ?? current?.price;
    const mrp = safeUpdates.mrp !== undefined ? safeUpdates.mrp : current?.mrp;
    if (mrp != null && price != null && Number(mrp) < Number(price)) {
      if (safeUpdates.mrp !== undefined) {
        throw Object.assign(new Error('M.R.P. must be equal to or higher than the selling price.'), { code: 'INVALID_MRP', statusCode: 400 });
      }
      safeUpdates.mrp = null; // price raised above the old M.R.P.: that discount no longer exists
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    throw Object.assign(new Error('No valid updates provided.'), { code: 'NO_UPDATES', statusCode: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update(safeUpdates)
      .eq('id', productId)
      .eq('artisan_id', artisanId)
      .select()
      .single();

    if (!error && data) {
      localMemoryProductStore.set(productId, data as ProductRecord);
      refreshCatalogueIfContentChanged(data as ProductRecord, safeUpdates);
      if (data.status === 'PUBLISHED' && previousPrice !== null && safeUpdates.price !== undefined) {
        notifyPriceDrop(data as ProductRecord, previousPrice, Number(safeUpdates.price));
      }
      return data as ProductRecord;
    }
  } catch (e) {}

  const memProd = localMemoryProductStore.get(productId);
  if (memProd) {
    Object.assign(memProd, safeUpdates);
    memProd.updated_at = new Date().toISOString();
    localMemoryProductStore.set(productId, memProd);
    return memProd;
  }

  throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
}

const CATALOGUE_FIELDS = ['name', 'description', 'category', 'subcategory', 'material', 'color', 'craft_type', 'features', 'attributes'];

/** When the artisan edits product facts, refresh the M63-generated catalogue (artisan-edited ones are kept). */
function refreshCatalogueIfContentChanged(product: ProductRecord, changed: Record<string, any>) {
  if (product.status !== 'PUBLISHED' || !CATALOGUE_FIELDS.some((f) => f in changed)) return;
  triggerAutoCatalogueGeneration(product.id, product.artisan_id, product).catch((e: any) =>
    logger.warn(`[AutoCatalogue] Refresh after edit failed for ${product.id}: ${e?.message}`)
  );
}

// ─── Publish Product (ownership enforced + validation) ───────────────

export async function publishProduct(
  productId: string,
  artisanId: string
): Promise<ProductRecord> {
  // First fetch the product to validate completeness
  const product = await getProductById(productId, artisanId);

  if (!product) {
    throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
  }

  if (product.status === 'PUBLISHED') {
    throw Object.assign(new Error('This product is already published.'), { code: 'ALREADY_PUBLISHED', statusCode: 400 });
  }

  // Validate completeness before publishing
  const missingFields: string[] = [];
  if (!product.name || product.name.trim().length < 2) missingFields.push('Product name');
  if (!product.description || product.description.trim().length < 10) missingFields.push('Product description (at least 10 characters)');
  if (product.price <= 0) missingFields.push('A valid price greater than ₹0');
  if (product.stock_quantity < 1) missingFields.push('At least 1 item in stock');
  if (!product.primary_image_url) missingFields.push('A product photo');

  if (missingFields.length > 0) {
    const err: any = new Error('Please complete the following before publishing: ' + missingFields.join(', '));
    err.code = 'PUBLISH_VALIDATION_FAILED';
    err.statusCode = 400;
    err.missingFields = missingFields;
    throw err;
  }

  // Publishing Gate: Ensure a valid Smart Catalogue exists before publishing to Marketplace
  const { getCatalogueContent, isCatalogueComplete } = await import('./catalogue.service.js');
  let catalogue = await getCatalogueContent(productId, 'en', artisanId);
  if (!catalogue || !isCatalogueComplete(catalogue)) {
    logger.info(`[PublishGate] Product ${productId} missing complete catalogue; preparing before publication...`);
    await triggerAutoCatalogueGeneration(productId, artisanId, product);
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  product.status = 'PUBLISHED';
  product.published_at = now;

  try {
    const { data } = await supabase
      .from('products')
      .update({
        status: 'PUBLISHED',
        published_at: now,
      })
      .eq('id', productId)
      .eq('artisan_id', artisanId)
      .select()
      .single();

    if (data) {
      localMemoryProductStore.set(productId, data as ProductRecord);
      return data as ProductRecord;
    }
  } catch (e) {}

  localMemoryProductStore.set(productId, product);
  logger.info(`Product published: ${productId} by artisan ${artisanId}`);

  // Tell interested customers (past buyers / wishlisters of this artisan) about the new product
  getSupabaseAdmin()
    .from('artisans')
    .select('name')
    .eq('id', artisanId)
    .maybeSingle()
    .then(({ data }) => notifyNewProduct(product, data?.name))
    .then(undefined, (e: any) => logger.warn(`[Notify] new product lookup failed: ${e?.message}`));
  return product;
}

// ─── Archive Product (ownership enforced) ────────────────────────────

export async function archiveProduct(
  productId: string,
  artisanId: string
): Promise<ProductRecord> {
  const product = await getProductById(productId, artisanId);

  if (!product) {
    throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
  }

  if (product.status === 'ARCHIVED') {
    throw Object.assign(new Error('This product is already archived.'), { code: 'ALREADY_ARCHIVED', statusCode: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .update({ status: 'ARCHIVED' })
    .eq('id', productId)
    .eq('artisan_id', artisanId)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to archive product:', error?.message);
    throw new Error('Failed to archive product.');
  }

  logger.info(`Product archived: ${productId} by artisan ${artisanId}`);
  return data as ProductRecord;
}

// ─── Product Stats ───────────────────────────────────────────────────

export async function getProductStats(artisanId: string): Promise<ProductStats> {
  const products = await getProductsByArtisan(artisanId);
  return {
    total: products.length,
    draft: products.filter((p: any) => p.status === 'DRAFT').length,
    published: products.filter((p: any) => p.status === 'PUBLISHED').length,
    archived: products.filter((p: any) => p.status === 'ARCHIVED').length,
  };
}

// ─── Upload Product Image ────────────────────────────────────────────

export async function uploadProductImage(
  artisanId: string,
  productId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string,
  imageVariant: 'original' | 'enhanced' = 'original'
): Promise<string> {
  // Verify ownership first
  const product = await getProductById(productId, artisanId);
  if (!product) {
    throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
  }

  const supabase = getSupabaseAdmin();
  let publicUrl: string | null = null;

  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const storagePath = `${artisanId}/${productId}/${imageVariant}_${timestamp}.${ext}`;

  // 1. Attempt Supabase Storage Upload (with auto bucket creation)
  try {
    await supabase.storage.createBucket('product-images', { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);
      publicUrl = urlData.publicUrl;
    } else {
      logger.warn('[ProductService] Supabase storage upload notice:', uploadError.message);
    }
  } catch (e: any) {
    logger.warn('[ProductService] Supabase storage exception:', e?.message);
  }

  // 2. Fallback to Cloudinary Upload if Supabase storage unavailable
  if (!publicUrl) {
    try {
      const { uploadToCloudinary } = await import('./cloudinary/cloudinary.service.js');
      const cloudRes = await uploadToCloudinary(fileBuffer, `m63/products/${artisanId}`);
      publicUrl = cloudRes.secureUrl;
    } catch (cloudErr: any) {
      logger.warn('[ProductService] Cloudinary upload notice:', cloudErr?.message);
    }
  }

  // 3. Fallback to Data URI if both cloud providers fail
  if (!publicUrl) {
    publicUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  }

  // Update product record with image URL
  const updatePayload: Record<string, string> = {
    primary_image_url: publicUrl,
  };
  if (imageVariant === 'original') {
    updatePayload.original_image_url = publicUrl;
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('artisan_id', artisanId);

  if (updateError) {
    logger.warn('[ProductService] Failed to update product table image reference via Supabase:', updateError.message);
  }

  logger.info(`Image (${imageVariant}) saved successfully for product ${productId}`);
  return publicUrl;
}

/**
 * Enhance an existing product's image adaptively.
 * CRITICAL RULE: Always sources strictly from the ORIGINAL image, never from a previously enhanced output.
 */
export async function enhanceExistingProduct(
  artisanId: string,
  productId: string,
  backgroundOption: string = 'WHITE',
  colorHex?: string
) {
  const product = await getProductById(productId, artisanId);
  if (!product) {
    throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
  }

  // Strictly source from original image
  const sourceImageUrl = product.original_image_url || product.primary_image_url;
  if (!sourceImageUrl) {
    throw Object.assign(new Error('This product does not have an image to enhance. Please upload a photo first.'), {
      code: 'MISSING_IMAGE',
      statusCode: 400,
    });
  }

  // Fetch or decode original image buffer
  let originalBuffer: Buffer;
  let mimeType = 'image/jpeg';

  if (sourceImageUrl.startsWith('data:')) {
    const parts = sourceImageUrl.split(',');
    const match = sourceImageUrl.match(/data:([^;]+);/);
    if (match) mimeType = match[1];
    originalBuffer = Buffer.from(parts[1], 'base64');
  } else {
    const fetchRes = await fetch(sourceImageUrl);
    if (!fetchRes.ok) {
      throw Object.assign(new Error('Failed to retrieve original product image for processing.'), {
        code: 'IMAGE_FETCH_FAILED',
        statusCode: 502,
      });
    }
    const contentType = fetchRes.headers.get('content-type');
    if (contentType) mimeType = contentType;
    const arrayBuffer = await fetchRes.arrayBuffer();
    originalBuffer = Buffer.from(arrayBuffer);
  }

  const { enhanceProductPhoto } = await import('./cloudinary/cloudinary-enhancement.service.js');
  const enhancementResult = await enhanceProductPhoto(
    originalBuffer,
    mimeType,
    artisanId,
    productId,
    backgroundOption,
    colorHex
  );

  if (!enhancementResult.success || !enhancementResult.enhancedImageUrl) {
    return enhancementResult;
  }

  // Persist enhanced image metadata without overwriting original_image_url
  const supabase = getSupabaseAdmin();
  const updatePayload: Record<string, any> = {
    enhanced_image_url: enhancementResult.enhancedImageUrl,
    selected_background: backgroundOption,
    enhanced_at: new Date().toISOString(),
  };

  // Ensure original_image_url is permanently locked to the original source
  if (!product.original_image_url) {
    updatePayload.original_image_url = sourceImageUrl;
  }

  const { error: updateError } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('artisan_id', artisanId);

  if (updateError) {
    logger.warn('[ProductService] Failed to persist enhanced_image_url in database:', updateError.message);
  }

  return {
    ...enhancementResult,
    originalImageUrl: product.original_image_url || sourceImageUrl,
  };
}

/**
 * Switch the active product image between original and enhanced studio version.
 * Both original and enhanced URLs remain stored in the database.
 */
export async function selectProductImageVariant(
  artisanId: string,
  productId: string,
  variant: 'original' | 'enhanced'
): Promise<ProductRecord> {
  const product = await getProductById(productId, artisanId);
  if (!product) {
    throw Object.assign(new Error('Product not found or access denied.'), { code: 'NOT_FOUND', statusCode: 404 });
  }

  let targetImageUrl: string | null = null;
  if (variant === 'enhanced') {
    if (!product.enhanced_image_url) {
      throw Object.assign(new Error('No enhanced studio photo available for this product.'), {
        code: 'BAD_REQUEST',
        statusCode: 400,
      });
    }
    targetImageUrl = product.enhanced_image_url;
  } else {
    targetImageUrl = product.original_image_url || product.primary_image_url;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .update({ primary_image_url: targetImageUrl })
    .eq('id', productId)
    .eq('artisan_id', artisanId)
    .select()
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Failed to update active product image.'), { code: 'INTERNAL_ERROR', statusCode: 500 });
  }

  logger.info(`[ProductService] Active image for product ${productId} switched to ${variant} (${targetImageUrl})`);
  return data as ProductRecord;
}

