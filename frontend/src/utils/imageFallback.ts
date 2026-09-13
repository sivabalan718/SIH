/**
 * Guaranteed High-Resolution Verified Craft Fallback Images
 * Used when an external Unsplash URL fails to load (404, 403, network drop).
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Textiles: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
  'Apparel & Textiles': 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
  Pottery: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
  Jewellery: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
  'Home Decor': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
  Handicrafts: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
  'Wood Craft': 'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=800&q=80',
  Paintings: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  Default: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
};

/**
 * Handles image load errors silently and replaces broken src with a working category image.
 */
export function handleProductImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string | null
) {
  const target = event.currentTarget;

  // Prevent infinite loops if fallback also fails
  if (target.dataset.fallbackApplied === 'true') {
    target.style.display = 'none'; // Hide if fallback fails
    return;
  }

  target.dataset.fallbackApplied = 'true';

  let fallbackUrl = CATEGORY_FALLBACK_IMAGES.Default;
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES[category];
  } else if (category && category.toLowerCase().includes('pottery')) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES.Pottery;
  } else if (category && (category.toLowerCase().includes('textile') || category.toLowerCase().includes('silk') || category.toLowerCase().includes('saree'))) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES.Textiles;
  } else if (category && (category.toLowerCase().includes('jewel') || category.toLowerCase().includes('metal') || category.toLowerCase().includes('brass'))) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES.Jewellery;
  } else if (category && (category.toLowerCase().includes('wood') || category.toLowerCase().includes('carving'))) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES['Wood Craft'];
  } else if (category && (category.toLowerCase().includes('paint') || category.toLowerCase().includes('canvas'))) {
    fallbackUrl = CATEGORY_FALLBACK_IMAGES.Paintings;
  }

  target.src = fallbackUrl;
}
