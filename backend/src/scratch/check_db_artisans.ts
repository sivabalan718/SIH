import { getSupabaseAdmin } from '../config/supabase.js';

async function checkDb() {
  const supabase = getSupabaseAdmin();
  const { data: artisans, error: artError } = await supabase.from('artisans').select('*');
  console.log('--- ARTISANS IN DB ---');
  if (artError) {
    console.error('Artisan fetch error:', artError.message);
  } else {
    console.log(`Found ${artisans?.length || 0} artisans:`);
    console.log(JSON.stringify(artisans, null, 2));
  }

  const { data: products, error: prodError } = await supabase.from('products').select('id, artisan_id, name, status');
  console.log('--- PRODUCTS IN DB ---');
  if (prodError) {
    console.error('Product fetch error:', prodError.message);
  } else {
    console.log(`Found ${products?.length || 0} products.`);
  }
}

checkDb().catch(console.error);
