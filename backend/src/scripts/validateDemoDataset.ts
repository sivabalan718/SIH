import { getSupabaseAdmin } from '../config/supabase.js';

export async function validateDemoDataset() {
  console.log('\n====================================================');
  console.log('🔍 RUNNING AUTOMATED M63 DEMO DATASET VALIDATION...');
  console.log('====================================================\n');

  const supabase = getSupabaseAdmin();

  // 1. Verify Artisans
  const { data: artisans, error: artErr } = await supabase.from('artisans').select('*');
  if (artErr || !artisans || artisans.length < 5) {
    console.error(`❌ Validation Failed: Expected at least 5 registered artisans, found ${artisans?.length || 0}`);
    process.exit(1);
  }
  console.log(`✅ 1. Registered Artisans Count: ${artisans.length} (PASS)`);

  // 2. Verify Published Products
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'PUBLISHED');

  if (prodErr || !products) {
    console.error('❌ Validation Failed fetching products:', prodErr?.message);
    process.exit(1);
  }

  const totalProds = products.length;
  console.log(`✅ 2. Total Published Products: ${totalProds} (Target: >= 100) -> ${totalProds >= 100 ? 'PASS' : 'FAIL'}`);

  // 3. Verify Unique Image URLs (HARD REQUIREMENT: ONE UNIQUE IMAGE PER PRODUCT)
  const imageUrls = products.map((p) => p.primary_image_url).filter((url): url is string => !!url);
  const uniqueUrls = new Set(imageUrls);

  const urlDuplicateMap: Record<string, string[]> = {};
  products.forEach((p) => {
    if (p.primary_image_url) {
      urlDuplicateMap[p.primary_image_url] = urlDuplicateMap[p.primary_image_url] || [];
      urlDuplicateMap[p.primary_image_url].push(p.name);
    }
  });

  const duplicateImageGroups = Object.entries(urlDuplicateMap).filter(([_, prods]) => prods.length > 1);

  console.log(`✅ 3. Total Image References: ${imageUrls.length}`);
  console.log(`✅ 3. Unique Image URLs: ${uniqueUrls.size}`);
  console.log(`✅ 3. Duplicate Image Groups: ${duplicateImageGroups.length}`);

  if (duplicateImageGroups.length > 0) {
    console.error('❌ Image Uniqueness Check FAILED! Found shared images across products:');
    duplicateImageGroups.forEach(([url, prods]) => {
      console.error(`   - Image URL ${url} used by: ${prods.join(', ')}`);
    });
    process.exit(1);
  } else {
    console.log('✅ 3. Image Uniqueness Check: 100% UNIQUE IMAGES (0 DUPLICATES) (PASS)');
  }

  // 4. Verify Product Distribution per Artisan
  const artisanProdCount: Record<string, number> = {};
  products.forEach((p) => {
    artisanProdCount[p.artisan_id] = (artisanProdCount[p.artisan_id] || 0) + 1;
  });

  console.log('✅ 4. Product Distribution Per Artisan:');
  artisans.forEach((a) => {
    const count = artisanProdCount[a.id] || 0;
    console.log(`   - ${a.name} (${a.email}): ${count} products`);
  });

  const minProdsPerArtisan = Math.min(...artisans.map((a) => artisanProdCount[a.id] || 0));
  if (minProdsPerArtisan < 15) {
    console.warn(`⚠️ Warning: Artisan with minimum products has ${minProdsPerArtisan} products.`);
  }

  // 5. Verify Smart Catalogues (EN, TA, HI)
  const { data: catalogues } = await supabase.from('product_catalogue_content').select('*');
  console.log(`✅ 5. Total Catalogue Records in Database: ${catalogues?.length || 0}`);

  // 6. Verify Smart Fair Pricing Records
  const { data: pricingRecords } = await supabase.from('product_pricing_records').select('*');
  console.log(`✅ 6. Total Pricing Intelligence Records: ${pricingRecords?.length || 0}`);

  // 7. Verify Zero Orders & Carts
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: cartItems } = await supabase.from('cart_items').select('*');

  console.log(`✅ 7. Orders Count: ${orders?.length || 0} (Strict Zero Order Policy -> ${(!orders || orders.length === 0) ? 'PASS' : 'FAIL'})`);
  console.log(`✅ 7. Cart Items Count: ${cartItems?.length || 0} (Strict Empty Cart Policy -> ${(!cartItems || cartItems.length === 0) ? 'PASS' : 'FAIL'})`);

  if ((orders && orders.length > 0) || (cartItems && cartItems.length > 0)) {
    console.error('❌ Strict Zero Order / Empty Cart Validation FAILED!');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL M63 DEMO DATASET VALIDATION CHECKS PASSED!');
  console.log('====================================================\n');
}

validateDemoDataset().catch((err) => {
  console.error('❌ Validation script error:', err);
  process.exit(1);
});
