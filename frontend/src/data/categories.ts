export interface CategoryOption {
  name: string;
  subcategories: string[];
}

export const CRAFT_CATEGORIES: CategoryOption[] = [
  {
    name: 'Handloom',
    subcategories: ['Saree', 'Dupatta', 'Shawl', 'Stole', 'Dress Material', 'Fabric', 'Other Handloom'],
  },
  {
    name: 'Handicraft',
    subcategories: ['Paper Mache', 'Brassware', 'Terracotta', 'Bamboo & Cane', 'Stone Carving', 'Metal Craft', 'Other Handicraft'],
  },
  {
    name: 'Pottery',
    subcategories: ['Clayware', 'Ceramic Vases', 'Earthenware', 'Glazed Pottery', 'Diyas & Planters', 'Other Pottery'],
  },
  {
    name: 'Jewellery',
    subcategories: ['Terracotta Jewellery', 'Beadwork', 'Silver & Filigree', 'Tribal Ornaments', 'Wooden Jewellery', 'Other Jewellery'],
  },
  {
    name: 'Woodcraft',
    subcategories: ['Carved Figures', 'Wooden Toys', 'Utensils & Trays', 'Wall Hangings', 'Furniture Accents', 'Other Woodcraft'],
  },
  {
    name: 'Textiles',
    subcategories: ['Block Print', 'Batik', 'Embroidery & Chikankari', 'Kantha Work', 'Tie & Dye / Bandhani', 'Other Textiles'],
  },
  {
    name: 'Home Decor',
    subcategories: ['Wall Decor', 'Lamps & Lighting', 'Rug & Carpet', 'Table Runner', 'Cushion Covers', 'Other Home Decor'],
  },
  {
    name: 'Traditional Art',
    subcategories: ['Madhubani', 'Pattachitra', 'Warli Painting', 'Tanjore Painting', 'Gond Art', 'Miniature Art', 'Other Art'],
  },
  {
    name: 'Other',
    subcategories: ['General Craft'],
  },
];
