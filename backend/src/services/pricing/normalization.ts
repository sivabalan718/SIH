import { CategoryProfileKey } from './config.js';

const STOP_WORDS = new Set([
  'beautiful', 'premium', 'quality', 'best', 'unique', 'elegant', 'traditional',
  'authentic', 'genuine', 'pure', 'fine', 'exclusive', 'luxury', 'stylish',
  'modern', 'classic', 'original', 'high', 'handcrafted', 'handmade', 'craft',
  'item', 'product', 'buy', 'shop', 'online', 'special', 'superb', 'fresh', 'excellent',
  'the', 'and', 'for', 'with', 'set', 'of', 'in', 'a', 'an'
]);

const DOMAIN_SYNONYMS: Record<string, string> = {
  'jewellery': 'jewellery',
  'jewelry': 'jewellery',
  'jewel': 'jewellery',
  'cottons': 'cotton',
  'kurtas': 'kurta',
  'sarees': 'saree',
  'sari': 'saree',
  'shawls': 'shawl',
  'stoles': 'shawl',
  'dupattas': 'dupatta',
  'earrings': 'earring',
  'ear ring': 'earring',
  'jhumka': 'earring',
  'jhumkas': 'earring',
  'necklace': 'necklace',
  'necklaces': 'necklace',
  'pendant': 'necklace',
  'choker': 'necklace',
  'terracotta': 'terracotta',
  'terra cotta': 'terracotta',
  'pottery': 'pottery',
  'earthenware': 'pottery',
  'clay': 'clay',
  'kulhad': 'kulhad',
  'kulhads': 'kulhad',
  'cup': 'cup',
  'cups': 'cup',
  'mug': 'mug',
  'mugs': 'mug',
  'jug': 'jug',
  'pitcher': 'jug',
  'vase': 'vase',
  'bowls': 'bowl',
  'bowl': 'bowl',
};

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function extractTokens(text: string): string[] {
  if (!text) return [];
  let clean = normalizeText(text);

  clean = clean
    .replace(/block[\s-_]*print(ed|ing)?/g, 'blockprint')
    .replace(/hand[\s-_]*woven/g, 'weaving')
    .replace(/hand[\s-_]*loom/g, 'weaving')
    .replace(/terra[\s-_]*cotta/g, 'terracotta')
    .replace(/ear[\s-_]*ring(s)?/g, 'earring');

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (const tok of rawTokens) {
    if (STOP_WORDS.has(tok)) continue;
    const syn = DOMAIN_SYNONYMS[tok] || tok;
    if (syn && syn.length > 1) {
      result.push(syn);
    }
  }

  return Array.from(new Set(result));
}

export function detectCategoryProfile(category?: string, subcategory?: string): CategoryProfileKey {
  const combined = ((category || '') + ' ' + (subcategory || '')).toLowerCase();
  
  if (combined.includes('pottery') || combined.includes('terracotta') || combined.includes('vessel') || combined.includes('tableware') || combined.includes('drinkware') || combined.includes('cup') || combined.includes('mug') || combined.includes('kitchen')) {
    return 'VESSELS_TABLEWARE';
  }
  if (combined.includes('textile') || combined.includes('apparel') || combined.includes('handloom') || combined.includes('saree') || combined.includes('kurta') || combined.includes('fabric') || combined.includes('clothing')) {
    return 'TEXTILES_APPAREL';
  }
  if (combined.includes('jewel') || combined.includes('accessory') || combined.includes('ornament') || combined.includes('necklace') || combined.includes('earring') || combined.includes('bangle')) {
    return 'JEWELLERY_ACCESSORIES';
  }
  if (combined.includes('furniture') || combined.includes('utility') || combined.includes('storage') || combined.includes('woodwork')) {
    return 'FURNITURE_UTILITY';
  }
  if (combined.includes('decorative') || combined.includes('sculpture') || combined.includes('statue') || combined.includes('idol') || combined.includes('carving')) {
    return 'DECORATIVE_SCULPTURAL';
  }
  if (combined.includes('painting') || combined.includes('art') || combined.includes('canvas') || combined.includes('tanjore')) {
    return 'PAINTING_ART';
  }

  return 'GENERAL_FALLBACK';
}
