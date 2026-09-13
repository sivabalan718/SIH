export type SupportedLang = 'en' | 'ta' | 'hi';

export interface TranslationDictionary {
  badge: string;
  platform: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchBtn: string;
  sortRecommended: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortNewest: string;
  profile: string;
  signIn: string;
  myOrders: string;
  cart: string;
  showingProducts: (count: number, total: number) => string;
  inStock: (qty: number) => string;
  outOfStock: string;
  addToCart: string;
  addingToCart: string;
  buyNow: string;
  sellingPrice: string;
  byArtisanLabel: (name: string, location: string) => string;
  noProductsTitle: string;
  noProductsSub: string;
  resetFilters: string;
  loadingProducts: string;
  retry: string;
  exitToHome: string;
  viewDetails: string;
  categoryAll: string;
  categoryTextiles: string;
  categoryPottery: string;
  categoryJewellery: string;
  categoryHomeDecor: string;
  categoryHandicrafts: string;
  categoryApparel: string;
  categoryWood: string;
  categoryPaintings: string;
  categoryOther: string;
}

export const translations: Record<SupportedLang, TranslationDictionary> = {
  en: {
    badge: 'DIRECT FROM ARTISANS',
    platform: 'M63 Commerce Platform',
    title: 'M63 Artisan Marketplace',
    subtitle: 'Discover authentic handwoven textiles, pottery, jewellery, and crafts. Purchased directly from verified Indian master artisans.',
    searchPlaceholder: 'Search products by name, craft, material, or category...',
    searchBtn: 'Search',
    sortRecommended: 'Sort: Recommended',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortNewest: 'Newest Arrivals',
    profile: 'Profile',
    signIn: 'Sign In',
    myOrders: 'My Orders',
    cart: 'Cart',
    showingProducts: (count, total) => `Showing ${count} of ${total} verified artisan products`,
    inStock: (qty) => `✓ In Stock (${qty})`,
    outOfStock: 'Out of Stock',
    addToCart: 'Add to Cart',
    addingToCart: 'Adding...',
    buyNow: 'Buy Now',
    sellingPrice: 'SELLING PRICE',
    byArtisanLabel: (name, location) => `By ${name} • ${location}`,
    noProductsTitle: 'No products found',
    noProductsSub: "We couldn't find any published products matching your selection. Try clearing your search filter.",
    resetFilters: 'Reset Filters',
    loadingProducts: 'Loading marketplace products...',
    retry: 'Retry',
    exitToHome: 'Exit to M63 Home',
    viewDetails: 'View Product',
    categoryAll: 'All',
    categoryTextiles: 'Textiles',
    categoryPottery: 'Pottery',
    categoryJewellery: 'Jewellery',
    categoryHomeDecor: 'Home Decor',
    categoryHandicrafts: 'Handicrafts',
    categoryApparel: 'Apparel & Textiles',
    categoryWood: 'Wood Craft',
    categoryPaintings: 'Paintings',
    categoryOther: 'Other',
  },
  ta: {
    badge: 'நேரடி கைவினைஞர்களிடமிருந்து',
    platform: 'M63 வர்த்தக தளம்',
    title: 'M63 கைவினைஞர் சந்தை',
    subtitle: 'உண்மையான கைநெசவு ஆடைகள், மண்பாண்டங்கள், ஆபரணங்கள் மற்றும் கைவினைப் பொருட்களைக் கண்டறியவும். சரிபார்க்கப்பட்ட இந்திய மாஸ்டர் கைவினைஞர்களிடமிருந்து நேரடியாக வாங்கவும்.',
    searchPlaceholder: 'பெயர், கைவினை, பொருள் அல்லது வகை மூலம் தயாரிப்புகளைத் தேடுங்கள்...',
    searchBtn: 'தேடு',
    sortRecommended: 'வரிசைப்படுத்து: பரிந்துரைக்கப்பட்டது',
    sortPriceAsc: 'விலை: குறைவிலிருந்து அதிகம்',
    sortPriceDesc: 'விலை: அதிகத்திலிருந்து குறைவு',
    sortNewest: 'புதிய வருகைகள்',
    profile: 'சுயவிவரம்',
    signIn: 'உள்நுழை',
    myOrders: 'என் ஆர்டர்கள்',
    cart: 'கூடை',
    showingProducts: (count, total) => `${total} இல் ${count} சரிபார்க்கப்பட்ட கைவினைப் பொருட்கள் காட்டப்படுகின்றன`,
    inStock: (qty) => `✓ இருப்பில் உள்ளது (${qty})`,
    outOfStock: 'இருப்பில் இல்லை',
    addToCart: 'கூடையில் சேர்',
    addingToCart: 'சேர்க்கப்படுகிறது...',
    buyNow: 'இப்போதே வாங்கு',
    sellingPrice: 'விற்பனை விலை',
    byArtisanLabel: (name, location) => `கைவினைஞர்: ${name} • ${location}`,
    noProductsTitle: 'தயாரிப்புகள் எதுவும் கிடைக்கவில்லை',
    noProductsSub: 'உங்கள் தேடலுக்கு ஏற்ற தயாரிப்புகள் எதுவும் கிடைக்கவில்லை. தேடலை மாற்ற முயற்சிக்கவும்.',
    resetFilters: 'வடிகட்டிகளை மீட்டமை',
    loadingProducts: 'சந்தை தயாரிப்புகள் ஏற்றப்படுகின்றன...',
    retry: 'மீண்டும் முயல்க',
    exitToHome: 'M63 முகப்பிற்கு செல்',
    viewDetails: 'விவரங்களை காண்',
    categoryAll: 'எல்லாம்',
    categoryTextiles: 'ஆடைகள் & நெசவு',
    categoryPottery: 'மண்பாண்டங்கள்',
    categoryJewellery: 'ஆபரணங்கள்',
    categoryHomeDecor: 'வீட்டு அலங்காரம்',
    categoryHandicrafts: 'கைவினைப்பொருட்கள்',
    categoryApparel: 'ஆடைகள்',
    categoryWood: 'மர கைவினை',
    categoryPaintings: 'ஓவியங்கள்',
    categoryOther: 'மற்றவை',
  },
  hi: {
    badge: 'सीधे कारीगरों से',
    platform: 'M63 वाणिज्य मंच',
    title: 'M63 कारीगर बाजार',
    subtitle: 'प्रामाणिक हथकरघा वस्त्र, मिट्टी के बर्तन, आभूषण और हस्तशिल्प की खोज करें। सत्यापित भारतीय मास्टर कारीगरों से सीधे खरीदें।',
    searchPlaceholder: 'नाम, शिल्प, सामग्री या श्रेणी के अनुसार उत्पाद खोजें...',
    searchBtn: 'खोजें',
    sortRecommended: 'क्रमबद्ध करें: अनुशंसित',
    sortPriceAsc: 'मूल्य: कम से अधिक',
    sortPriceDesc: 'मूल्य: अधिक से कम',
    sortNewest: 'नवीनतम उत्पाद',
    profile: 'प्रोफ़ाइल',
    signIn: 'साइन इन',
    myOrders: 'मेरे ऑर्डर',
    cart: 'कार्ट',
    showingProducts: (count, total) => `${total} में से ${count} सत्यापित कारीगर उत्पाद दिखाए जा रहे हैं`,
    inStock: (qty) => `✓ स्टॉक में उपलब्ध (${qty})`,
    outOfStock: 'स्टॉक समाप्त',
    addToCart: 'कार्ट में जोड़ें',
    addingToCart: 'जोड़ा जा रहा है...',
    buyNow: 'अभी खरीदें',
    sellingPrice: 'बिक्री मूल्य',
    byArtisanLabel: (name, location) => `कारीगर: ${name} • ${location}`,
    noProductsTitle: 'कोई उत्पाद नहीं मिला',
    noProductsSub: 'आपकी खोज के अनुसार कोई उत्पाद नहीं मिला। कृपया पुनः प्रयास करें।',
    resetFilters: 'फ़िल्टर रीसेट करें',
    loadingProducts: 'बाजार के उत्पाद लोड हो रहे हैं...',
    retry: 'पुनः प्रयास करें',
    exitToHome: 'M63 होम पर जाएं',
    viewDetails: 'विवरण देखें',
    categoryAll: 'सभी',
    categoryTextiles: 'कपड़े और वस्त्र',
    categoryPottery: 'मिट्टी के बर्तन',
    categoryJewellery: 'आभूषण',
    categoryHomeDecor: 'गृह सज्जा',
    categoryHandicrafts: 'हस्तशिल्प',
    categoryApparel: 'परिधान',
    categoryWood: 'काष्ठ कला',
    categoryPaintings: 'चित्रकला',
    categoryOther: 'अन्य',
  },
};

/**
 * Smart product name translation map for common craft terminology
 */
export function translateProductName(name: string, lang: SupportedLang): string {
  if (lang === 'en' || !name) return name;

  if (lang === 'ta') {
    let text = name;
    text = text.replace(/Handmade/gi, 'கையால் செய்யப்பட்ட');
    text = text.replace(/Traditional/gi, 'பாரம்பரிய');
    text = text.replace(/Fabric/gi, 'துணி');
    text = text.replace(/Rag Doll/gi, 'பொம்மை');
    text = text.replace(/Puppet/gi, 'பாவை');
    text = text.replace(/Girl/gi, 'சிறுமி');
    text = text.replace(/Solid Brass/gi, 'திட பித்தளை');
    text = text.replace(/Antique/gi, 'பழங்கால');
    text = text.replace(/Nawab Style/gi, 'நவாப் பாணி');
    text = text.replace(/Chessmen Set/gi, 'சதுரங்கக் காய் தொகுப்பு');
    text = text.replace(/Kalighat Style/gi, 'காளிகாட் பாணி');
    text = text.replace(/Canvas Painting/gi, 'கேன்வாஸ் ஓவியம்');
    text = text.replace(/Papier-Mâché/gi, 'பேப்பர்-மாஷே');
    text = text.replace(/Floral/gi, 'மலர்');
    text = text.replace(/Tea Coasters/gi, 'டீ கோஸ்டர்கள்');
    text = text.replace(/Set of 6/gi, '6 பொருட்கள்');
    text = text.replace(/Silk Saree/gi, 'பட்டுப் புடவை');
    text = text.replace(/Pure Silk/gi, 'தூய பட்டு');
    text = text.replace(/Handloom/gi, 'கைத்தறி');
    text = text.replace(/Wooden Toy/gi, 'மர பொம்மை');
    text = text.replace(/Clay Water Jug/gi, 'களிமண் தண்ணீர் கூஜா');
    text = text.replace(/Terracotta/gi, 'டெரகோட்டா');
    text = text.replace(/Brass Lamp/gi, 'பித்தளை விளக்கு');
    text = text.replace(/Diyas/gi, 'அகல் விளக்குகள்');
    text = text.replace(/Pashmina/gi, 'பஷ்மினா');
    text = text.replace(/Shawl/gi, 'பொன்னாடை');
    return text;
  }

  if (lang === 'hi') {
    let text = name;
    text = text.replace(/Handmade/gi, 'हस्तनिर्मित');
    text = text.replace(/Traditional/gi, 'पारंपरिक');
    text = text.replace(/Fabric/gi, 'कपड़ा');
    text = text.replace(/Rag Doll/gi, 'गुड़िया');
    text = text.replace(/Solid Brass/gi, 'ठोस पीतल');
    text = text.replace(/Antique/gi, 'प्राचीन');
    text = text.replace(/Chessmen Set/gi, 'शतरंज सेट');
    text = text.replace(/Kalighat Style/gi, 'कालीघाट शैली');
    text = text.replace(/Canvas Painting/gi, 'कैनवास पेंटिंग');
    text = text.replace(/Papier-Mâché/gi, 'पेपर-माचे');
    text = text.replace(/Floral/gi, 'फूलों की कटाई');
    text = text.replace(/Tea Coasters/gi, 'टी कोस्टर');
    text = text.replace(/Silk Saree/gi, 'सिल्क साड़ी');
    text = text.replace(/Pure Silk/gi, 'शुद्ध रेशम');
    text = text.replace(/Handloom/gi, 'हथकरघा');
    text = text.replace(/Wooden Toy/gi, 'लकड़ी का खिलौना');
    text = text.replace(/Terracotta/gi, 'टेराकोटा');
    text = text.replace(/Brass Lamp/gi, 'पीतल का दीपक');
    text = text.replace(/Shawl/gi, 'शॉल');
    return text;
  }

  return name;
}

/**
 * Smart product short description translation
 */
export function translateProductDescription(desc: string, lang: SupportedLang): string {
  if (lang === 'en' || !desc) return desc;

  if (lang === 'ta') {
    let text = desc;
    text = text.replace(/Charming eco-friendly soft rag doll made from upcycled handloom.../gi, 'சுற்றுச்சூழலுக்கு ஏற்ற கையால் செய்யப்பட்ட பாரம்பரிய மென்மையான துணி பொம்மை...');
    text = text.replace(/Heavy solid brass hand-cast chess pieces representing Mughal Royalty.../gi, 'முகலாய ராயல்டியை பிரதிநிதித்துவப்படுத்தும் கனமான திட பித்தளை கைவினை சதுரங்கக் காய்கள்...');
    text = text.replace(/Classic 19th-century Bengal Kalighat revival painting rendered with.../gi, 'பாரம்பரிய 19 ஆம் நூற்றாண்டு பெங்கால் காளிகாட் மறுமலர்ச்சி ஓவியம்...');
    text = text.replace(/Set of 6 waterproof lacquered papier-mâché coasters hand-painted.../gi, '6 நீர்ப்புகா பேப்பர்-மாஷே டீ கோஸ்டர்கள் கொண்ட தொகுப்பு...');
    text = text.replace(/Handcrafted by master artisans using traditional techniques/gi, 'பாரம்பரிய நுட்பங்களைப் பயன்படுத்தி கைவினைஞர்களால் தயாரிக்கப்பட்டது');
    text = text.replace(/made from/gi, 'தயாரிக்கப்பட்டது:');
    text = text.replace(/upcycled handloom/gi, 'கைத்தறி துணி');
    text = text.replace(/hand-painted/gi, 'கையால் ஓவியம் வரையப்பட்ட');
    text = text.replace(/hand-cast/gi, 'கையால் வார்க்கப்பட்ட');
    return text;
  }

  if (lang === 'hi') {
    let text = desc;
    text = text.replace(/Charming eco-friendly soft rag doll made from upcycled handloom.../gi, 'पर्यावरण के अनुकूल हाथ से बनी पारंपरिक रेशमी कपड़े की गुड़िया...');
    text = text.replace(/Heavy solid brass hand-cast chess pieces representing Mughal Royalty.../gi, 'मुगल राजघराने का प्रतिनिधित्व करने वाले भारी ठोस पीतल के शतरंज के मोहरे...');
    text = text.replace(/Classic 19th-century Bengal Kalighat revival painting rendered with.../gi, 'क्लासिक 19वीं सदी की बंगाल कालीघाट पुनरुद्धार चित्रकला...');
    text = text.replace(/Set of 6 waterproof lacquered papier-mâché coasters hand-painted.../gi, 'हाथ से रंगे 6 वॉटरप्रूफ पेपर-माचे टी कोस्टरों का सेट...');
    text = text.replace(/Handcrafted by master artisans using traditional techniques/gi, 'पारंपरिक तकनीकों का उपयोग करके कारीगरों द्वारा हस्तनिर्मित');
    return text;
  }

  return desc;
}

/**
 * Translate category names
 */
export function translateCategoryName(cat: string, lang: SupportedLang): string {
  const dict = translations[lang];
  switch (cat) {
    case 'All': return dict.categoryAll;
    case 'Textiles': return dict.categoryTextiles;
    case 'Pottery': return dict.categoryPottery;
    case 'Jewellery': return dict.categoryJewellery;
    case 'Home Decor': return dict.categoryHomeDecor;
    case 'Handicrafts': return dict.categoryHandicrafts;
    case 'Apparel & Textiles': return dict.categoryApparel;
    case 'Wood Craft': return dict.categoryWood;
    case 'Paintings': return dict.categoryPaintings;
    case 'Other': return dict.categoryOther;
    default: return cat;
  }
}
