/** All visible words of the v2 analytics UI in one place. */
const T = {
  title: { en: 'How your shop is doing', ta: 'உங்கள் கடை எப்படி இயங்குகிறது', hi: 'आपकी दुकान कैसी चल रही है' },
  method: { en: 'How is this calculated?', ta: 'இது எப்படி கணக்கிடப்படுகிறது?', hi: 'यह कैसे गिना जाता है?' },
  refresh: { en: 'Refresh', ta: 'புதுப்பி', hi: 'रिफ्रेश' },
  loading: {
    en: 'Loading M63 Business Intelligence Command Centre...',
    ta: 'M63 வணிக நுண்ணறிவு மையம் ஏற்றப்படுகிறது...',
    hi: 'M63 व्यापार विश्लेषण केंद्र लोड हो रहा है...',
  },
  retry: { en: 'Retry loading', ta: 'மீண்டும் ஏற்று', hi: 'फिर से लोड करें' },
  salesOverTime: { en: 'Sales over time', ta: 'காலவாரி விற்பனை', hi: 'समय के साथ बिक्री' },
  total: { en: 'Total', ta: 'மொத்தம்', hi: 'कुल' },
  revenue: { en: 'Revenue', ta: 'வருவாய்', hi: 'कमाई' },
  orders: { en: 'Orders', ta: 'ஆர்டர்கள்', hi: 'ऑर्डर' },
  avgOrder: { en: 'Average order', ta: 'சராசரி ஆர்டர்', hi: 'औसत ऑर्डर' },
  bestDay: { en: 'Best day', ta: 'சிறந்த நாள்', hi: 'सबसे अच्छा दिन' },
  busiestDay: { en: 'Busiest day', ta: 'பரபரப்பான நாள்', hi: 'सबसे व्यस्त दिन' },
  vsAvg: { en: 'vs daily average', ta: 'தினசரி சராசரியை விட', hi: 'दैनिक औसत से' },
  topProducts: { en: 'Top products', ta: 'முன்னணி பொருட்கள்', hi: 'शीर्ष उत्पाद' },
  byRevenue: { en: 'by revenue', ta: 'வருவாயின்படி', hi: 'कमाई के अनुसार' },
  units: { en: 'sold', ta: 'விற்பனை', hi: 'बिके' },
  categories: { en: 'Where sales come from', ta: 'விற்பனை எங்கிருந்து வருகிறது', hi: 'बिक्री कहाँ से आती है' },
  other: { en: 'Other', ta: 'மற்றவை', hi: 'अन्य' },
  stock: { en: 'Stock health', ta: 'இருப்பு நிலை', hi: 'स्टॉक की सेहत' },
  healthy: { en: 'healthy', ta: 'நலமாக', hi: 'ठीक' },
  items: { en: 'items', ta: 'பொருட்கள்', hi: 'ஆइटम' },
  fulfil: { en: 'Order progress', ta: 'ஆர்டர் முன்னேற்றம்', hi: 'ऑर्डर की प्रगति' },
  ofOrders: { en: 'of orders', ta: 'ஆர்டர்களில்', hi: 'ऑर्डर में' },
  insights: { en: 'Advice from M63 AI', ta: 'M63 AI ஆலோசனை', hi: 'M63 AI की सलाह' },
  insightsSub: { en: 'Built from your own numbers', ta: 'உங்கள் எண்களிலிருந்து', hi: 'आपके अपने आँकड़ों से' },
  method2: { en: 'Data trust and method', ta: 'தரவு நம்பகத்தன்மை', hi: 'डेटा भरोसा और तरीका' },
  empty: { en: 'No data for this period yet', ta: 'இந்தக் காலத்திற்கு தரவு இல்லை', hi: 'इस अवधि के लिए अभी डेटा नहीं है' },
  toneGood: { en: 'Opportunity', ta: 'வாய்ப்பு', hi: 'अवसर' },
  toneWarn: { en: 'Keep an eye', ta: 'கவனிக்கவும்', hi: 'ध्यान दें' },
  toneRisk: { en: 'Act now', ta: 'உடனே செயல்படுங்கள்', hi: 'तुरंत करें' },
  toneInfo: { en: 'Note', ta: 'குறிப்பு', hi: 'सूचना' },
} as const;

export type CopyKey = keyof typeof T;

export const t = (key: CopyKey, lang: string): string => {
  const entry = T[key] as Record<string, string>;
  return entry[lang] ?? entry.en;
};

export const periodText = (period: string, lang: string): string => {
  const m = /^(\d+)d$/.exec(period);
  if (!m) return period;
  if (lang === 'ta') return `கடந்த ${m[1]} நாட்கள்`;
  if (lang === 'hi') return `पिछले ${m[1]} दिन`;
  return `Last ${m[1]} days`;
};
