import { TargetProductInput, RawCandidateProduct } from './types.js';
import { normalizeText } from './normalization.js';

export interface FunctionalGateResult {
  passed: boolean;
  reason: string;
  functionalFamilyTarget: string;
  functionalFamilyCandidate: string;
  compatibilityLevel: 'COMPATIBLE' | 'CONTEXTUAL_ONLY' | 'INCOMPATIBLE';
}

export type FunctionalFamily =
  | 'BEVERAGE_DRINKWARE'
  | 'FOOD_TABLEWARE'
  | 'WATER_VESSEL'
  | 'STORAGE_CONTAINER'
  | 'HOME_DECOR_VASE'
  | 'HOME_DECOR_ORNAMENT'
  | 'LIGHTING'
  | 'FIGURINE_IDOL'
  | 'WEARABLE_APPAREL'
  | 'BAGS_ACCESSORIES'
  | 'JEWELLERY'
  | 'FURNITURE'
  | 'TOYS_DOLLS'
  | 'PAINTINGS_WALL_ART'
  | 'GENERAL_CRAFT';

interface FamilyDefinition {
  family: FunctionalFamily;
  keywords: string[];
  compatibleWith: FunctionalFamily[]; // Families that can pass as primary/secondary
  contextualWith: FunctionalFamily[]; // Families that can only pass as contextual (non-benchmark)
}

const FUNCTIONAL_FAMILIES: FamilyDefinition[] = [
  {
    family: 'BEVERAGE_DRINKWARE',
    keywords: [
      'cup', 'cups', 'kulhad', 'kulhads', 'mug', 'mugs', 'glass', 'glasses',
      'tumbler', 'tumblers', 'tea set', 'coffee set', 'drinkware', 'beverage', 'tea cup', 'coffee mug'
    ],
    compatibleWith: ['BEVERAGE_DRINKWARE'],
    contextualWith: ['FOOD_TABLEWARE'],
  },
  {
    family: 'FOOD_TABLEWARE',
    keywords: [
      'plate', 'plates', 'bowl', 'bowls', 'platter', 'platters', 'thali',
      'serving bowl', 'dinner set', 'saucer', 'cutlery', 'dining', 'handi', 'kadai', 'spoon'
    ],
    compatibleWith: ['FOOD_TABLEWARE'],
    contextualWith: ['BEVERAGE_DRINKWARE'],
  },
  {
    family: 'WATER_VESSEL',
    keywords: [
      'water bottle', 'bottle', 'pitcher', 'jug', 'water jug', 'surahi', 'matka',
      'water cooler', 'water pot', 'dispenser'
    ],
    compatibleWith: ['WATER_VESSEL'],
    contextualWith: ['STORAGE_CONTAINER'],
  },
  {
    family: 'STORAGE_CONTAINER',
    keywords: [
      'jar', 'jars', 'canister', 'canisters', 'container', 'spice box', 'masala dabba',
      'storage pot', 'box', 'caddy', 'bin', 'basket'
    ],
    compatibleWith: ['STORAGE_CONTAINER'],
    contextualWith: ['WATER_VESSEL'],
  },
  {
    family: 'HOME_DECOR_VASE',
    keywords: [
      'vase', 'vases', 'flower vase', 'floor vase', 'urn', 'planter', 'planters',
      'flower pot', 'pottery vase', 'decorative pot'
    ],
    compatibleWith: ['HOME_DECOR_VASE'],
    contextualWith: ['HOME_DECOR_ORNAMENT'],
  },
  {
    family: 'HOME_DECOR_ORNAMENT',
    keywords: [
      'wind chime', 'windchime', 'hanging bell', 'wall hanging', 'bell', 'bells',
      'decorative plate', 'plaque', 'incense holder', 'agarbatti stand', 'toran'
    ],
    compatibleWith: ['HOME_DECOR_ORNAMENT'],
    contextualWith: ['HOME_DECOR_VASE'],
  },
  {
    family: 'LIGHTING',
    keywords: [
      'lamp', 'lamps', 'table lamp', 'floor lamp', 'diya', 'diyas', 'oil lamp',
      'lantern', 'lanterns', 'candle stand', 'candle holder', 'tealight', 'light'
    ],
    compatibleWith: ['LIGHTING'],
    contextualWith: [],
  },
  {
    family: 'FIGURINE_IDOL',
    keywords: [
      'figurine', 'figurines', 'idol', 'idols', 'statue', 'statues', 'sculpture',
      'ganesha', 'ganpati', 'buddha', 'deity', 'animal figurine', 'terracotta horse', 'elephant'
    ],
    compatibleWith: ['FIGURINE_IDOL'],
    contextualWith: [],
  },
  {
    family: 'WEARABLE_APPAREL',
    keywords: [
      'saree', 'sari', 'sarees', 'kurta', 'kurtas', 'dupatta', 'dupattas', 'shawl', 'shawls',
      'stole', 'stoles', 'dress', 'tunic', 'shirt', 'skirt', 'fabric', 'clothing', 'apparel', 'kurti'
    ],
    compatibleWith: ['WEARABLE_APPAREL'],
    contextualWith: [],
  },
  {
    family: 'BAGS_ACCESSORIES',
    keywords: [
      'bag', 'bags', 'tote', 'totes', 'clutch', 'pouch', 'pouches', 'purse',
      'wallet', 'belt', 'scarf', 'handbag', 'jholas'
    ],
    compatibleWith: ['BAGS_ACCESSORIES'],
    contextualWith: [],
  },
  {
    family: 'JEWELLERY',
    keywords: [
      'necklace', 'necklaces', 'earring', 'earrings', 'jhumka', 'jhumkas', 'bangle', 'bangles',
      'bracelet', 'bracelets', 'ring', 'rings', 'choker', 'pendant', 'anklet', 'jewellery', 'jewelry'
    ],
    compatibleWith: ['JEWELLERY'],
    contextualWith: [],
  },
  {
    family: 'FURNITURE',
    keywords: [
      'table', 'chair', 'chairs', 'stool', 'stools', 'bench', 'shelf', 'mudda',
      'cabinet', 'furniture'
    ],
    compatibleWith: ['FURNITURE'],
    contextualWith: [],
  },
  {
    family: 'TOYS_DOLLS',
    keywords: [
      'toy', 'toys', 'doll', 'dolls', 'puppet', 'puppets', 'board game', 'puzzle',
      'kondapalli', 'channapatna'
    ],
    compatibleWith: ['TOYS_DOLLS'],
    contextualWith: [],
  },
  {
    family: 'PAINTINGS_WALL_ART',
    keywords: [
      'painting', 'paintings', 'canvas', 'tanjore', 'madhubani', 'pattachitra',
      'wall art', 'mural', 'scroll'
    ],
    compatibleWith: ['PAINTINGS_WALL_ART'],
    contextualWith: [],
  },
];

export function detectFunctionalFamily(
  name?: string | null,
  category?: string | null,
  subcategory?: string | null,
  productType?: string | null
): FunctionalFamily {
  const combined = normalizeText(`${productType || ''} ${subcategory || ''} ${name || ''} ${category || ''}`);

  for (const def of FUNCTIONAL_FAMILIES) {
    for (const kw of def.keywords) {
      // Word boundary regex to avoid partial matches (e.g., 'pot' in 'pottery')
      const regex = new RegExp(`(^|\\b|\\s)${kw}(\\b|\\s|$)`, 'i');
      if (regex.test(combined)) {
        return def.family;
      }
    }
  }

  return 'GENERAL_CRAFT';
}

export function evaluateFunctionalGate(
  target: TargetProductInput,
  candidate: RawCandidateProduct
): FunctionalGateResult {
  const targetFamily = detectFunctionalFamily(target.name, target.category, target.subcategory, target.productType);
  const candidateFamily = detectFunctionalFamily(candidate.name, candidate.category, candidate.subcategory, candidate.product_type);

  // 1. Cross-Category Check: completely disjoint domains (e.g. Textiles vs Pottery)
  const targetCat = normalizeText(target.category || '');
  const candidateCat = normalizeText(candidate.category || '');

  if (targetCat && candidateCat && targetCat !== candidateCat) {
    if (
      (targetCat.includes('textile') && !candidateCat.includes('textile')) ||
      (targetCat.includes('pottery') && !candidateCat.includes('pottery')) ||
      (targetCat.includes('jewel') && !candidateCat.includes('jewel')) ||
      (targetCat.includes('wood') && !candidateCat.includes('wood') && !candidateCat.includes('furniture'))
    ) {
      return {
        passed: false,
        reason: `Cross-category domain mismatch: "${target.category}" vs "${candidate.category}"`,
        functionalFamilyTarget: targetFamily,
        functionalFamilyCandidate: candidateFamily,
        compatibilityLevel: 'INCOMPATIBLE',
      };
    }
  }

  // 2. Clear Functional Family Resolution
  if (targetFamily !== 'GENERAL_CRAFT') {
    const targetDef = FUNCTIONAL_FAMILIES.find((f) => f.family === targetFamily)!;

    if (candidateFamily !== 'GENERAL_CRAFT') {
      if (targetDef.compatibleWith.includes(candidateFamily)) {
        return {
          passed: true,
          reason: `Functionally compatible (${targetFamily} ↔ ${candidateFamily})`,
          functionalFamilyTarget: targetFamily,
          functionalFamilyCandidate: candidateFamily,
          compatibilityLevel: 'COMPATIBLE',
        };
      }

      if (targetDef.contextualWith.includes(candidateFamily)) {
        return {
          passed: true,
          reason: `Contextually related tableware/vessel (${targetFamily} ↔ ${candidateFamily})`,
          functionalFamilyTarget: targetFamily,
          functionalFamilyCandidate: candidateFamily,
          compatibilityLevel: 'CONTEXTUAL_ONLY',
        };
      }

      // Functional Mismatch: completely different function within same material/category
      // (e.g. Tea Cup vs Floor Vase, Table Lamp, Figurine, Wind Chime)
      return {
        passed: false,
        reason: `Functional mismatch: Target is ${targetFamily}, but candidate is ${candidateFamily} (unrelated functional use)`,
        functionalFamilyTarget: targetFamily,
        functionalFamilyCandidate: candidateFamily,
        compatibilityLevel: 'INCOMPATIBLE',
      };
    } else {
      // Candidate could not be classified into a specific family:
      // If target is drinkware/tableware, unknown craft cannot pass as primary benchmark
      return {
        passed: true,
        reason: `Candidate has general unclassified craft type; downgraded to contextual`,
        functionalFamilyTarget: targetFamily,
        functionalFamilyCandidate: 'GENERAL_CRAFT',
        compatibilityLevel: 'CONTEXTUAL_ONLY',
      };
    }
  }

  // General fallback
  return {
    passed: true,
    reason: 'Passed general craft gate',
    functionalFamilyTarget: targetFamily,
    functionalFamilyCandidate: candidateFamily,
    compatibilityLevel: 'COMPATIBLE',
  };
}
