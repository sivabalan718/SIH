import {
  generateFairPriceRecommendation,
  extractPricingFromVoice,
  calculateProductSimilarity,
  FairPricingInput,
} from '../services/ai/pricing-intelligence.service.js';

// Comprehensive dataset evaluation items covering all craft categories & edge cases
const DEMO_TEST_PRODUCTS: FairPricingInput[] = [
  // 1. Textiles & Handlooms (Strong Data)
  {
    name: 'Kanchipuram Pure Mulberry Silk Saree',
    category: 'Textiles & Handlooms',
    subcategory: 'Saree',
    material: 'Mulberry Silk',
    craft_type: 'Handloom Weaving',
    features: ['Zari border', 'Traditional motif', 'Silk Mark certified'],
    existing_price: 18500,
    material_cost: 6500,
    labour_cost: 4500,
    other_expenses: 500,
    production_time: 7,
    production_time_unit: 'days',
  },
  {
    name: 'Handblock Printed Chanderi Cotton Stole',
    category: 'Textiles & Handlooms',
    subcategory: 'Dupatta / Stole',
    material: 'Chanderi Cotton',
    craft_type: 'Block Printing',
    features: ['Natural vegetable dye', 'Handloom fabric'],
    existing_price: 1200,
    material_cost: 350,
    labour_cost: 300,
    other_expenses: 50,
    production_time: 2,
    production_time_unit: 'days',
  },

  // 2. Pottery & Terracotta
  {
    name: 'Handcrafted Terracotta Water Pitcher with Clay Cup',
    category: 'Pottery & Terracotta',
    subcategory: 'Earthenware',
    material: 'Natural Clay',
    craft_type: 'Wheel Pottery',
    features: ['Natural cooling', 'Unglazed organic clay'],
    existing_price: 650,
    material_cost: 120,
    labour_cost: 200,
    other_expenses: 30,
    production_time: 3,
    production_time_unit: 'days',
  },

  // 3. Jewellery & Metalware
  {
    name: 'Antique Brass Temple Jewellery Necklace',
    category: 'Jewellery & Metalware',
    subcategory: 'Necklace',
    material: 'Solid Brass',
    craft_type: 'Hand Carving & Casting',
    features: ['Kempu stone inlay', 'Antique gold finish'],
    existing_price: 2400,
    material_cost: 600,
    labour_cost: 800,
    other_expenses: 150,
    production_time: 5,
    production_time_unit: 'days',
  },

  // 4. Woodcraft & Carvings
  {
    name: 'Carved Teak Wood Decorative Wall Panel',
    category: 'Woodcraft & Carvings',
    subcategory: 'Wall Decor',
    material: 'Seasoned Teak Wood',
    craft_type: 'Relief Wood Carving',
    features: ['Floral carving', 'Natural beeswax polish'],
    existing_price: 4500,
    material_cost: 1200,
    labour_cost: 1800,
    other_expenses: 250,
    production_time: 6,
    production_time_unit: 'days',
  },

  // 5. Cane & Bamboo
  {
    name: 'Woven Assam Bamboo Storage Basket with Handle',
    category: 'Cane & Bamboo',
    subcategory: 'Basketry',
    material: 'Natural Cane & Bamboo',
    craft_type: 'Hand Weaving',
    features: ['Eco-friendly', 'Lightweight & durable'],
    existing_price: 850,
    material_cost: 150,
    labour_cost: 300,
    other_expenses: 40,
    production_time: 2,
    production_time_unit: 'days',
  },

  // 6. Paintings & Wall Art
  {
    name: 'Traditional Tanjore Gold Leaf Ganesha Painting',
    category: 'Paintings & Wall Art',
    subcategory: 'Tanjore Painting',
    material: '22k Gold Leaf & Wood',
    craft_type: 'Tanjore Art',
    features: ['22k Gold foil work', 'Teak wood frame included'],
    existing_price: 12500,
    material_cost: 3500,
    labour_cost: 4000,
    other_expenses: 500,
    production_time: 10,
    production_time_unit: 'days',
  },

  // 7. EDGE CASE 1 — Below Cost Protection
  {
    name: 'Underpriced Clay Diya Set (Below Cost Test)',
    category: 'Pottery & Terracotta',
    material: 'Red Clay',
    craft_type: 'Hand Molding',
    existing_price: 200, // Below recorded cost of 400
    material_cost: 150,
    labour_cost: 200,
    other_expenses: 50,
    production_time: 1,
    production_time_unit: 'days',
  },

  // 8. EDGE CASE 2 — Product Fact Conflict Gate (Virat Kohli Jersey Mismatch)
  {
    name: 'Virat Kohli Jersey',
    category: 'Textiles & Handlooms',
    material: 'cotton',
    craft_type: 'Handloom Weaving',
    features: ['high-performance polyester fabric', 'dryCELL technology'],
    existing_price: 500,
    material_cost: 800,
    labour_cost: 200,
    other_expenses: 200,
  },

  // 9. EDGE CASE 3 — Explicit Zero Cost
  {
    name: 'Handcrafted Coconut Shell Cup (Explicit Zero Other Expenses)',
    category: 'Handicrafts',
    material: 'Coconut Shell',
    craft_type: 'Shell Carving',
    existing_price: 350,
    material_cost: 50,
    labour_cost: 150,
    other_expenses: 0, // Explicit 0
    production_time: 1,
    production_time_unit: 'days',
  },

  // 10. EDGE CASE 4 — Missing Cost Components
  {
    name: 'Niche Carved Bone Inlay Box (Missing Cost Details)',
    category: 'Handicrafts',
    material: 'Camel Bone & Wood',
    craft_type: 'Bone Inlay',
    existing_price: 3200,
    material_cost: null,
    labour_cost: null,
    other_expenses: null,
  },
];

export async function validatePricingDataset() {
  console.log('\n========================================================================');
  console.log('🔍 M63 SMART FAIR PRICING INTELLIGENCE — HYBRID SIMILARITY EVALUATION');
  console.log('========================================================================\n');

  let passedCount = 0;
  let totalEvaluated = DEMO_TEST_PRODUCTS.length;
  const evaluationResults: any[] = [];

  for (let i = 0; i < DEMO_TEST_PRODUCTS.length; i++) {
    const input = DEMO_TEST_PRODUCTS[i];
    console.log(`[EVALUATING ${i + 1}/${totalEvaluated}] ${input.name} (${input.category})`);

    const result = await generateFairPriceRecommendation(input, 'en');

    const knownCost = (input.material_cost || 0) + (input.labour_cost || 0) + (input.other_expenses || 0);

    // Quality Safeguard Checks
    const isCostFloorRespected = knownCost === 0 || (result.fair_price_min! >= knownCost && result.suggested_price! >= knownCost);
    const isRangeValid = result.fair_price_min! <= result.suggested_price! && result.suggested_price! <= result.fair_price_max!;
    const isNonGeneric = !(result.price_justification || '').toLowerCase().includes('suitable based on product quality');

    // Conflict handling test
    let isConflictHandled = true;
    if (input.name === 'Virat Kohli Jersey') {
      isConflictHandled = result.product_validation?.has_conflicts === true && result.confidence !== 'high';
    }

    // Below Cost Warning test
    let belowCostWarningTriggered = true;
    if (input.existing_price && knownCost > 0 && input.existing_price <= knownCost) {
      belowCostWarningTriggered =
        result.comparison_with_artisan_price.position_status === 'below' &&
        result.comparison_with_artisan_price.message.includes('WARNING');
    }

    const passedAllChecks = isCostFloorRespected && isRangeValid && isNonGeneric && isConflictHandled && belowCostWarningTriggered;

    if (passedAllChecks) passedCount++;

    evaluationResults.push({
      product: input.name,
      category: input.category,
      artisanPrice: input.existing_price ? `₹${input.existing_price}` : 'Not set',
      knownCost: knownCost > 0 ? `₹${knownCost}` : 'Missing',
      range: `₹${result.fair_price_min} – ₹${result.fair_price_max}`,
      suggested: `₹${result.suggested_price}`,
      confidence: result.confidence.toUpperCase(),
      conflicts: result.product_validation?.has_conflicts ? `YES (${result.product_validation.conflicts.length})` : 'NONE',
      position: result.comparison_with_artisan_price.position_status,
      passed: passedAllChecks ? '✅ PASS' : '❌ FAIL',
    });

    console.log(`   └─ Suggested: ₹${result.suggested_price} | Range: ₹${result.fair_price_min}–₹${result.fair_price_max} | Confidence: ${result.confidence.toUpperCase()} | Conflicts: ${result.product_validation?.has_conflicts ? 'YES' : 'NONE'}`);
    console.log(`   └─ Justification: "${result.price_justification}"\n`);
  }

  // ── REQUIRED SPECIFIC TEST CASE: PRODUCT TYPE & SIMILARITY COMPARISON ──
  console.log('[EVALUATING SIMILARITY ENGINE] Cotton Kurta vs Saree vs Pottery Vase');

  const targetProduct = {
    name: 'Block Print Cotton Kurta',
    category: 'Textiles & Handlooms',
    subcategory: 'Kurta',
    material: 'Cotton',
    craft_type: 'Hand Block Printing',
    description: 'Handcrafted cotton kurta with floral block-print patterns.',
  };

  const candA = {
    name: 'Handblock Printed Cotton Kurta',
    category: 'Textiles & Handlooms',
    subcategory: 'Kurta',
    material: 'Cotton',
    craft_type: 'Hand Block Printing',
    price: 1850,
  };

  const candB = {
    name: 'Block Print Cotton Saree',
    category: 'Textiles & Handlooms',
    subcategory: 'Saree',
    material: 'Cotton',
    craft_type: 'Hand Block Printing',
    price: 2400,
  };

  const candC = {
    name: 'Handcrafted Terracotta Clay Pottery Vase',
    category: 'Pottery & Terracotta',
    subcategory: 'Earthenware',
    material: 'Natural Clay',
    craft_type: 'Wheel Pottery',
    description: 'Handmade traditional beautiful premium quality terracotta vase',
    price: 750,
  };

  const simA = calculateProductSimilarity(targetProduct, candA);
  const simB = calculateProductSimilarity(targetProduct, candB);
  const simC = calculateProductSimilarity(targetProduct, candC);

  console.log(`   └─ Candidate A (Cotton Kurta): Score = ${simA.score} (Matched: ${simA.matchedAttributes.join(', ')})`);
  console.log(`   └─ Candidate B (Cotton Saree): Score = ${simB.score} (Matched: ${simB.matchedAttributes.join(', ')})`);
  console.log(`   └─ Candidate C (Pottery Vase): Score = ${simC.score} (Matched: ${simC.matchedAttributes.join(', ')})`);

  const simEnginePassed =
    simA.score >= 0.70 && // Candidate A is Tier 1
    simA.score > simB.score && // Candidate A has higher similarity than Candidate B (Kurta vs Saree)
    simC.score < 0.35; // Candidate C is REJECTED (< 0.35 threshold)

  console.log(`   └─ Hybrid Similarity Engine Test Passed: ${simEnginePassed ? '✅ YES' : '❌ NO'}\n`);

  // Evaluate Voice Ambiguity Safety Test
  console.log('[EVALUATING VOICE SAFETY] Ambiguous Single Number "500"');
  const voiceRes = await extractPricingFromVoice(Buffer.from('500'), 'audio/webm', 'en', '500');
  const voiceSafetyPassed = voiceRes.needs_clarification === true && voiceRes.ambiguous_fields.length > 0 && voiceRes.extracted.material_cost === null;
  console.log(`   └─ Voice Ambiguity Handled Safely: ${voiceSafetyPassed ? '✅ YES' : '❌ NO'}\n`);

  console.log('========================================================================');
  console.log('📊 EVALUATION SUMMARY REPORT');
  console.log('========================================================================');
  console.table(evaluationResults);

  if (passedCount === totalEvaluated && simEnginePassed && voiceSafetyPassed) {
    console.log(`\n🎉 EVALUATION COMPLETED: ${passedCount}/${totalEvaluated} Product Scenarios Passed All Intelligence & Quality Safeguards.\n`);
  } else {
    console.error(`❌ Validation Failed: Passed ${passedCount}/${totalEvaluated}, SimEngine: ${simEnginePassed}, Voice: ${voiceSafetyPassed}.`);
    process.exit(1);
  }
}

// Execute evaluation if run directly
validatePricingDataset().catch((err) => {
  console.error('Fatal Evaluation Script Error:', err);
  process.exit(1);
});
