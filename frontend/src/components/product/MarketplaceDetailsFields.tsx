import React from 'react';
import { Store, Tag } from 'lucide-react';

type Lang = 'en' | 'ta' | 'hi';

export interface MarketplaceDetails {
  mrp: string;
  attributes: Record<string, string>;
}

interface FieldDef {
  key: string;
  label: Record<Lang, string>;
  placeholder: string;
}

const F = (key: string, en: string, ta: string, hi: string, placeholder: string): FieldDef => ({ key, label: { en, ta, hi }, placeholder });

const DIMENSIONS = F('dimensions', 'Size / dimensions', 'அளவு / பரிமாணம்', 'आकार / माप', 'e.g. 20 cm tall, 12 cm wide');
const WEIGHT = F('weight', 'Weight', 'எடை', 'वज़न', 'e.g. 450 g');
const SET = F('set_size', 'Pieces in a set / pack', 'தொகுப்பில் எத்தனை', 'सेट में कितने', 'e.g. Set of 6');
const FINISH = F('finish', 'Finish / colour detail', 'மேற்பூச்சு', 'फ़िनिश', 'e.g. Natural terracotta, matte');
const CAPACITY = F('capacity', 'Capacity', 'கொள்ளளவு', 'क्षमता', 'e.g. 2 litres');
const USE = F('intended_use', 'Used for', 'பயன்பாடு', 'उपयोग', 'e.g. Storing drinking water');
const LENGTH = F('length', 'Length', 'நீளம்', 'लंबाई', 'e.g. 6.3 m (with blouse piece)');
const OCCASION = F('occasion', 'Occasion', 'சந்தர்ப்பம்', 'अवसर', 'e.g. Weddings, festive wear');
const CARE = F('care', 'Care instructions', 'பராமரிப்பு', 'देखभाल', 'e.g. Dry clean only');
const CUSTOM = F('customization', 'Customisation available', 'தனிப்பயனாக்கம்', 'अनुकूलन', 'e.g. Name engraving on request');

/** Category-aware details: only fields that matter for this kind of product. */
function fieldsFor(category: string): FieldDef[] {
  const c = (category || '').toLowerCase();
  if (/pot|ceramic|terracotta|clay/.test(c)) return [CAPACITY, DIMENSIONS, SET, FINISH, USE, CARE, CUSTOM];
  if (/textile|handloom|saree|apparel|fabric/.test(c)) return [LENGTH, DIMENSIONS, OCCASION, FINISH, CARE, CUSTOM];
  if (/jewel/.test(c)) return [DIMENSIONS, WEIGHT, FINISH, OCCASION, CARE, CUSTOM];
  if (/paint|art/.test(c)) return [DIMENSIONS, F('finish', 'Medium / surface', 'ஊடகம்', 'माध्यम', 'e.g. Natural colours on handmade paper'), F('framing', 'Framing', 'சட்டம்', 'फ़्रेम', 'e.g. Unframed'), CARE, CUSTOM];
  if (/toy|doll/.test(c)) return [DIMENSIONS, F('age_group', 'Suitable age', 'வயது', 'उम्र', 'e.g. 3 years and above'), FINISH, CARE, CUSTOM];
  return [DIMENSIONS, WEIGHT, SET, FINISH, USE, CARE, CUSTOM];
}

const T = {
  title: { en: 'Marketplace details', ta: 'சந்தை விவரங்கள்', hi: 'मार्केटप्लेस विवरण' },
  subtitle: {
    en: 'Optional. Customers see these on your product page. Only add what is true for this product.',
    ta: 'விருப்பத்தேர்வு. வாடிக்கையாளர்கள் இவற்றை உங்கள் பொருள் பக்கத்தில் பார்ப்பார்கள்.',
    hi: 'वैकल्पिक। ग्राहक इन्हें आपके उत्पाद पेज पर देखेंगे।',
  },
  mrp: { en: 'Original price / M.R.P. (₹)', ta: 'அசல் விலை / M.R.P. (₹)', hi: 'मूल कीमत / M.R.P. (₹)' },
  mrpHelp: {
    en: 'Only if you are genuinely offering a lower price than usual.',
    ta: 'வழக்கத்தை விட குறைந்த விலை தரும்போது மட்டும்.',
    hi: 'केवल तभी जब आप सच में कम कीमत दे रहे हों।',
  },
};

export function mrpError(mrp: string, price: string): string | null {
  if (!mrp.trim()) return null;
  const m = Number(mrp);
  const p = Number(price);
  if (!Number.isFinite(m) || m <= 0) return 'Enter a valid amount';
  if (Number.isFinite(p) && p > 0 && m < p) return 'M.R.P. must be higher than your selling price';
  return null;
}

/** Converts the form state to API fields (empty values removed, never invented). */
export function toMarketplacePayload(d: MarketplaceDetails): { mrp: number | null; attributes: Record<string, string> } {
  const attributes: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.attributes)) if (v && v.trim()) attributes[k] = v.trim();
  const m = Number(d.mrp);
  return { mrp: d.mrp.trim() && Number.isFinite(m) && m > 0 ? m : null, attributes };
}

export const MarketplaceDetailsFields: React.FC<{
  category: string;
  price: string;
  value: MarketplaceDetails;
  onChange: (v: MarketplaceDetails) => void;
  lang?: Lang;
}> = ({ category, price, value, onChange, lang = 'en' }) => {
  const fields = fieldsFor(category);
  const err = mrpError(value.mrp, price);
  const p = Number(price);
  const m = Number(value.mrp);
  const off = !err && m > p && p > 0 ? Math.round(((m - p) / m) * 100) : 0;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--m63-border)',
    background: 'var(--m63-bg-surface)',
    color: 'var(--m63-slate)',
    fontSize: '0.92rem',
  };
  const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'block', marginBottom: 6 };

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--m63-border)', paddingTop: 20 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--m63-slate)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Store size={18} /> {T.title[lang]}
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', margin: '4px 0 14px' }}>{T.subtitle[lang]}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <label>
          <span style={labelStyle}>
            <Tag size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            {T.mrp[lang]}
          </span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={value.mrp}
            onChange={(e) => onChange({ ...value, mrp: e.target.value })}
            style={{ ...inputStyle, borderColor: err ? '#dc2626' : undefined }}
            placeholder="e.g. 1200"
            aria-invalid={Boolean(err)}
          />
          <span style={{ fontSize: '0.75rem', color: err ? '#dc2626' : off ? '#047857' : 'var(--m63-slate-subtle)', display: 'block', marginTop: 4 }}>
            {err || (off ? `Customers will see ${off}% off` : T.mrpHelp[lang])}
          </span>
        </label>

        {fields.map((f) => (
          <label key={f.key}>
            <span style={labelStyle}>{f.label[lang]}</span>
            <input
              type="text"
              maxLength={200}
              value={value.attributes[f.key] || ''}
              onChange={(e) => onChange({ ...value, attributes: { ...value.attributes, [f.key]: e.target.value } })}
              style={inputStyle}
              placeholder={f.placeholder}
            />
          </label>
        ))}
      </div>
    </div>
  );
};
