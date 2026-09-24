import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  Square,
  Check,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import {
  PricingLanguage,
  ProductionTimeUnit,
  ExtractedPricingFields,
  VoiceExtractionResponse,
  FairPriceRecommendationResponse,
  extractPricingVoice,
  recommendFairPrice,
} from '../../services/pricingService.js';

const UI_STRINGS = {
  en: {
    header: '✨ M63 SMART PRICE',
    recommendedPriceLabel: 'RECOMMENDED PRICE',
    priceProtectsCosts: '🛡️ This price protects your costs',
    marketAlignedPrice: 'Market-aligned price',
    yourProductCost: 'YOUR PRODUCT COST',
    minimumSellingPrice: 'MINIMUM SELLING PRICE',
    includesMarkup: 'Includes your chosen markup.',
    pricesSeenSimilar: 'PRICES SEEN FOR SIMILAR PRODUCTS',
    pricesSeenSubtext: 'Based on similar products found in the marketplace.',
    costHigherTitle: '⚠️ YOUR COST IS HIGHER THAN THE USUAL SELLING PRICE',
    costHigherBody: (marketPrice: string, minPrice: string) =>
      `Similar products are selling for around ₹${marketPrice}, but your minimum selling price is ₹${minPrice}. M63 does not recommend selling below ₹${minPrice}.`,
    whyThisPriceTitle: '💡 WHY M63 RECOMMENDS THIS PRICE',
    whyThisPriceBodyCostProtected: (cost: string, marketPrice: string, minPrice: string) =>
      `Your product costs ₹${cost} to make. Similar products are selling around ₹${marketPrice}. Your chosen markup brings your minimum selling price to ₹${minPrice}. M63 recommends ₹${minPrice} so your production costs are protected.`,
    whyThisPriceBodyMarketAligned: (cost: string, marketPrice: string, recPrice: string) =>
      `Your product costs ₹${cost} to make. Similar products in the marketplace sell around ₹${marketPrice}. Based on market evidence, M63 recommends ₹${recPrice}.`,
    similarProductsTitle: 'Similar products we looked at',
    limitedMarketEvidence: 'Limited price information available',
    comparableProductsTitle: 'COMPARABLE PRODUCTS',
    comparableProductsStats: (total: number, used: number, excluded: number) =>
      `${total} products analyzed • ${used} used for pricing • ${excluded} excluded`,
    comparableProductsSubtext: 'More relevant products have a greater influence on the suggested price.',
    usedForPricingTitle: 'USED FOR PRICING',
    matchedLabel: 'Matched',
    priceInfluenceLabel: 'Price influence',
    whyIsItSimilar: 'Why is it similar?',
    whyIsItSimilarHeader: 'WHY IS IT SIMILAR?',
    productTypeLabel: 'Product type',
    productTypeVal: '✓ Similar product type and category',
    intendedUseLabel: 'Intended use',
    intendedUseVal: '✓ Used for similar purpose',
    materialLabel: 'Material',
    materialVal: '✓ Made from similar material',
    craftLabel: 'Craft',
    craftVal: '✓ Similar craft technique',
    quantityLabel: 'Quantity / scale',
    quantityVal: '✓ Similar set/quantity scale',
    differenceHeader: 'Difference',
    seeDetails: 'See price details',
    hideDetails: 'Hide price details',
    useRecommendedPrice: '✨ Use Recommended Price',
    priceApplied: '✓ Price Applied to Form',
    keepMyPrice: 'Keep My Price',
    keptMyPrice: '✓ Kept My Price',
  },
  ta: {
    header: '✨ M63 ஸ்மார்ட் விலை',
    recommendedPriceLabel: 'பரிந்துரைக்கப்பட்ட விலை',
    priceProtectsCosts: '🛡️ இந்த விலை உங்கள் உற்பத்தி செலவை பாதுகாக்கிறது',
    marketAlignedPrice: 'சந்தைக்கேற்ற சீரான விலை',
    yourProductCost: 'உங்கள் தயாரிப்பு செலவு',
    minimumSellingPrice: 'குறைந்தபட்ச விற்பனை விலை',
    includesMarkup: 'லாப வரம்பு சேர்க்கப்பட்டுள்ளது.',
    pricesSeenSimilar: 'ஒத்த தயாரிப்புகளின் சந்தை விலை',
    pricesSeenSubtext: 'சந்தையில் உள்ள ஒத்த தயாரிப்புகளின் அடிப்படையில்.',
    costHigherTitle: '⚠️ உங்கள் செலவு வழக்கமான விற்பனை விலையை விட அதிகமாக உள்ளது',
    costHigherBody: (marketPrice: string, minPrice: string) =>
      `ஒத்த தயாரிப்புகள் சுமார் ₹${marketPrice}-க்கு விற்கப்படுகின்றன, ஆனால் உங்கள் குறைந்தபட்ச விற்பனை விலை ₹${minPrice}. ₹${minPrice}-க்கு கீழே விற்க M63 பரிந்துரைக்கவில்லை.`,
    whyThisPriceTitle: '💡 M63 ஏன் இந்த விலையை பரிந்துரைக்கிறது',
    whyThisPriceBodyCostProtected: (cost: string, marketPrice: string, minPrice: string) =>
      `உங்கள் தயாரிப்பை உருவாக்க ₹${cost} செலவாகிறது. ஒத்த தயாரிப்புகள் ₹${marketPrice}-க்கு விற்கப்படுகின்றன. உங்கள் குறைந்தபட்ச விற்பனை விலை ₹${minPrice}. உங்கள் செலவுகள் பாதுகாக்கப்பட M63 ₹${minPrice}-ஐ பரிந்துரைக்கிறது.`,
    whyThisPriceBodyMarketAligned: (cost: string, marketPrice: string, recPrice: string) =>
      `உங்கள் தயாரிப்பு செலவு ₹${cost}. சந்தையில் ஒத்த தயாரிப்புகள் ₹${marketPrice}-க்கு விற்கப்படுகின்றன. M63 ₹${recPrice}-ஐ பரிந்துரைக்கிறது.`,
    similarProductsTitle: 'நாங்கள் பார்த்த ஒத்த தயாரிப்புகள்',
    limitedMarketEvidence: 'குறைந்த அளவிலான சந்தை தகவல்கள் மட்டுமே உள்ளன',
    comparableProductsTitle: 'ஒப்பிடக்கூடிய தயாரிப்புகள்',
    comparableProductsStats: (total: number, used: number, excluded: number) =>
      `${total} தயாரிப்புகள் பகுப்பாய்வு செய்யப்பட்டன • ${used} விலைக்குப் பயன்படுத்தப்பட்டன • ${excluded} விலக்கப்பட்டன`,
    comparableProductsSubtext: 'அதிக பொருத்தமான தயாரிப்புகள் பரிந்துரைக்கப்பட்ட விலையில் அதிக செல்வாக்கைக் கொண்டுள்ளன.',
    usedForPricingTitle: 'விலை நிர்ணயத்திற்கு பயன்படுத்தப்பட்டது',
    matchedLabel: 'பொருந்தியது',
    priceInfluenceLabel: 'விலை செல்வாக்கு',
    whyIsItSimilar: 'இது ஏன் ஒத்திருக்கிறது?',
    whyIsItSimilarHeader: 'இது ஏன் ஒத்திருக்கிறது?',
    productTypeLabel: 'தயாரிப்பு வகை',
    productTypeVal: '✓ ஒத்த தயாரிப்பு வகை மற்றும் பிரிவு',
    intendedUseLabel: 'பயன்பாட்டு நோக்கம்',
    intendedUseVal: '✓ ஒத்த பயன்பாட்டிற்கு உகந்தது',
    materialLabel: 'பொருள் (Material)',
    materialVal: '✓ ஒத்த மூலப்பொருளால் செய்யப்பட்டது',
    craftLabel: 'கைவினைத் தொழில்',
    craftVal: '✓ ஒத்த கைவினை நுட்பம்',
    quantityLabel: 'அளவு / எண்ணிக்கை',
    quantityVal: '✓ ஒத்த அளவு மற்றும் எண்ணிக்கை',
    differenceHeader: 'வேறுபாடு',
    seeDetails: 'விலை விவரங்களை காண்க',
    hideDetails: 'விலை விவரங்களை மறைக்க',
    useRecommendedPrice: '✨ பரிந்துரைக்கப்பட்ட விலையை பயன்படுத்துக',
    priceApplied: '✓ விலை படிவத்தில் சேர்க்கப்பட்டது',
    keepMyPrice: 'என் விலையை வைத்துக்கொள்கிறேன்',
    keptMyPrice: '✓ என் விலை வைக்கப்பட்டது',
  },
  hi: {
    header: '✨ M63 स्मार्ट मूल्य',
    recommendedPriceLabel: 'अनुशंसित मूल्य',
    priceProtectsCosts: '🛡️ यह मूल्य आपकी लागत की रक्षा करता है',
    marketAlignedPrice: 'बाजार के अनुकूल मूल्य',
    yourProductCost: 'आपकी उत्पाद लागत',
    minimumSellingPrice: 'न्यूनतम बिक्री मूल्य',
    includesMarkup: 'आपका चुना हुआ लाभ मार्जिन शामिल है।',
    pricesSeenSimilar: 'समान उत्पादों की बाजार कीमत',
    pricesSeenSubtext: 'बाजार में उपलब्ध समान उत्पादों के आधार पर।',
    costHigherTitle: '⚠️ आपकी लागत सामान्य बिक्री मूल्य से अधिक है',
    costHigherBody: (marketPrice: string, minPrice: string) =>
      `समान उत्पाद लगभग ₹${marketPrice} में बिक रहे हैं, लेकिन आपका न्यूनतम बिक्री मूल्य ₹${minPrice} है। M63 ₹${minPrice} से कम में बेचने की सलाह नहीं देता है।`,
    whyThisPriceTitle: '💡 M63 इस मूल्य की सिफारिश क्यों करता है',
    whyThisPriceBodyCostProtected: (cost: string, marketPrice: string, minPrice: string) =>
      `आपके उत्पाद की निर्माण लागत ₹${cost} है। समान उत्पाद लगभग ₹${marketPrice} में बिक रहे हैं। आपका न्यूनतम बिक्री मूल्य ₹${minPrice} है। M63 ₹${minPrice} की सिफारिश करता है ताकि आपकी लागत सुरक्षित रहे।`,
    whyThisPriceBodyMarketAligned: (cost: string, marketPrice: string, recPrice: string) =>
      `आपके उत्पाद की लागत ₹${cost} है। बाजार में समान उत्पाद ₹${marketPrice} के आसपास बिकते हैं। M63 ₹${recPrice} की सिफारिश करता है।`,
    similarProductsTitle: 'समान उत्पाद जो हमने देखे',
    limitedMarketEvidence: 'सीमित मूल्य जानकारी उपलब्ध है',
    comparableProductsTitle: 'समान उत्पाद (COMPARABLE PRODUCTS)',
    comparableProductsStats: (total: number, used: number, excluded: number) =>
      `${total} उत्पाद विश्लेषण किए गए • ${used} मूल्य निर्धारण के लिए उपयोग किए गए • ${excluded} बाहर रखे गए`,
    comparableProductsSubtext: 'अधिक प्रासंगिक उत्पादों का अनुशंसित मूल्य पर अधिक प्रभाव पड़ता है।',
    usedForPricingTitle: 'मूल्य निर्धारण के लिए प्रयुक्त',
    matchedLabel: 'समान विशेषताएं',
    priceInfluenceLabel: 'मूल्य प्रभाव',
    whyIsItSimilar: 'यह समान क्यों है?',
    whyIsItSimilarHeader: 'यह समान क्यों है?',
    productTypeLabel: 'उत्पाद का प्रकार',
    productTypeVal: '✓ समान उत्पाद प्रकार और श्रेणी',
    intendedUseLabel: 'उपयोग का उद्देश्य',
    intendedUseVal: '✓ समान उद्देश्य के लिए उपयोग',
    materialLabel: 'सामग्री (Material)',
    materialVal: '✓ समान सामग्री से बना है',
    craftLabel: 'हस्तशिल्प (Craft)',
    craftVal: '✓ समान शिल्प तकनीक',
    quantityLabel: 'मात्रा / पैमाना',
    quantityVal: '✓ समान मात्रा और पैमाना',
    differenceHeader: 'अंतर (Difference)',
    seeDetails: 'मूल्य विवरण देखें',
    hideDetails: 'मूल्य विवरण छुपाएं',
    useRecommendedPrice: '✨ अनुशंसित मूल्य का उपयोग करें',
    priceApplied: '✓ मूल्य फॉर्म में लागू किया गया',
    keepMyPrice: 'मेरा मूल्य रखें',
    keptMyPrice: '✓ मेरा मूल्य रखा गया',
  },
};

interface SmartFairPricingSectionProps {
  productData: {
    name?: string;
    category?: string;
    subcategory?: string;
    material?: string;
    craft_type?: string;
    features?: string[];
    price?: number;
  };
  productId?: string;
  initialPricing?: {
    material_cost?: number | null;
    labour_cost?: number | null;
    other_expenses?: number | null;
    production_time?: number | null;
    production_time_unit?: ProductionTimeUnit | null;
    recommendation?: FairPriceRecommendationResponse | null;
    recommendation_status?: 'none' | 'applied' | 'kept' | 'outdated';
    active_language?: PricingLanguage;
  };
  onPricingChange?: (pricingState: {
    material_cost: number | null;
    labour_cost: number | null;
    other_expenses: number | null;
    production_time: number | null;
    production_time_unit: ProductionTimeUnit | null;
    recommendation: FairPriceRecommendationResponse | null;
    recommendation_status: 'none' | 'applied' | 'kept' | 'outdated';
    active_language: PricingLanguage;
  }) => void;
  onApplyRecommendedPrice?: (suggestedPrice: number) => void;
}

export const SmartFairPricingSection: React.FC<SmartFairPricingSectionProps> = ({
  productData,
  productId,
  initialPricing,
  onPricingChange,
  onApplyRecommendedPrice,
}) => {
  // Language & Input States
  const [activeLanguage, setActiveLanguage] = useState<PricingLanguage>(initialPricing?.active_language || 'en');
  const [materialCost, setMaterialCost] = useState<string>(initialPricing?.material_cost != null ? String(initialPricing.material_cost) : '');
  const [labourCost, setLabourCost] = useState<string>(initialPricing?.labour_cost != null ? String(initialPricing.labour_cost) : '');
  const [otherExpenses, setOtherExpenses] = useState<string>(initialPricing?.other_expenses != null ? String(initialPricing.other_expenses) : '');
  const [productionTime, setProductionTime] = useState<string>(initialPricing?.production_time != null ? String(initialPricing.production_time) : '');
  const [productionTimeUnit, setProductionTimeUnit] = useState<ProductionTimeUnit>(initialPricing?.production_time_unit || 'days');

  // Recommendation & Calculation States
  const [recommendation, setRecommendation] = useState<FairPriceRecommendationResponse | null>(initialPricing?.recommendation || null);
  const [recommendationStatus, setRecommendationStatus] = useState<'none' | 'applied' | 'kept' | 'outdated'>(initialPricing?.recommendation_status || 'none');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Voice Recording States
  const [activeRecordingField, setActiveRecordingField] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Voice Review Card State
  const [voiceReviewData, setVoiceReviewData] = useState<VoiceExtractionResponse | null>(null);
  const [editableVoiceFields, setEditableVoiceFields] = useState<ExtractedPricingFields | null>(null);

  // Ambiguity Modal State
  const [ambiguityState, setAmbiguityState] = useState<{
    value: number;
    question: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any | null>(null);
  const browserTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (initialPricing) {
      if (initialPricing.material_cost != null) setMaterialCost(String(initialPricing.material_cost));
      if (initialPricing.labour_cost != null) setLabourCost(String(initialPricing.labour_cost));
      if (initialPricing.other_expenses != null) setOtherExpenses(String(initialPricing.other_expenses));
      if (initialPricing.production_time != null) setProductionTime(String(initialPricing.production_time));
      if (initialPricing.production_time_unit) setProductionTimeUnit(initialPricing.production_time_unit);
      if (initialPricing.recommendation) setRecommendation(initialPricing.recommendation);
      if (initialPricing.recommendation_status) setRecommendationStatus(initialPricing.recommendation_status);
      if (initialPricing.active_language) setActiveLanguage(initialPricing.active_language);
    }
  }, [initialPricing]);

  const matNum = parseFloat(materialCost) || 0;
  const labNum = parseFloat(labourCost) || 0;
  const othNum = parseFloat(otherExpenses) || 0;
  const knownCost = matNum + labNum + othNum;

  useEffect(() => {
    if (onPricingChange) {
      onPricingChange({
        material_cost: materialCost ? parseFloat(materialCost) : null,
        labour_cost: labourCost ? parseFloat(labourCost) : null,
        other_expenses: otherExpenses ? parseFloat(otherExpenses) : null,
        production_time: productionTime ? parseFloat(productionTime) : null,
        production_time_unit: productionTimeUnit,
        recommendation,
        recommendation_status: isOutdated ? 'outdated' : recommendationStatus,
        active_language: activeLanguage,
      });
    }
  }, [materialCost, labourCost, otherExpenses, productionTime, productionTimeUnit, recommendation, recommendationStatus, isOutdated, activeLanguage]);

  const handleInputChange = (fieldSetter: (val: string) => void, val: string) => {
    fieldSetter(val);
    if (recommendation) {
      setIsOutdated(true);
    }
  };

  const startRecording = async (targetField: string) => {
    try {
      setVoiceNotice(null);
      audioChunksRef.current = [];
      browserTranscriptRef.current = '';
      setActiveRecordingField(targetField);
      setIsRecording(true);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = activeLanguage === 'ta' ? 'ta-IN' : activeLanguage === 'hi' ? 'hi-IN' : 'en-IN';
          rec.onresult = (e: any) => {
            let text = '';
            for (let i = 0; i < e.results.length; i++) {
              text += e.results[i][0].transcript;
            }
            if (text.trim()) browserTranscriptRef.current = text.trim();
          };
          rec.start();
          speechRecognitionRef.current = rec;
        } catch (e) {}
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err: any) {
      setIsRecording(false);
      setActiveRecordingField(null);
      setVoiceNotice('Microphone access unavailable. You can type values manually.');
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processVoiceAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessingVoice(true);
      setVoiceNotice(null);

      const result = await extractPricingVoice(audioBlob, activeLanguage, browserTranscriptRef.current);

      if (result.needs_clarification && result.ambiguous_fields.length > 0) {
        setAmbiguityState({
          value: result.ambiguous_fields[0].value,
          question: result.clarification_question || `I heard ₹${result.ambiguous_fields[0].value}. What does this amount represent?`,
        });
      } else {
        setVoiceReviewData(result);
        setEditableVoiceFields({ ...result.extracted });
      }
    } catch (err: any) {
      setVoiceNotice('Voice understanding is temporarily unavailable. You can enter cost values manually.');
    } finally {
      setIsProcessingVoice(false);
      setActiveRecordingField(null);
    }
  };

  const handleConfirmVoiceReview = () => {
    if (!editableVoiceFields) return;

    if (editableVoiceFields.material_cost != null) setMaterialCost(String(editableVoiceFields.material_cost));
    if (editableVoiceFields.labour_cost != null) setLabourCost(String(editableVoiceFields.labour_cost));
    if (editableVoiceFields.other_expenses != null) setOtherExpenses(String(editableVoiceFields.other_expenses));
    if (editableVoiceFields.production_time != null) setProductionTime(String(editableVoiceFields.production_time));
    if (editableVoiceFields.production_time_unit) setProductionTimeUnit(editableVoiceFields.production_time_unit);

    setVoiceReviewData(null);
    setEditableVoiceFields(null);
    if (recommendation) setIsOutdated(true);
  };

  const handleResolveAmbiguity = (chosenField: keyof ExtractedPricingFields) => {
    if (!ambiguityState) return;

    const val = ambiguityState.value;
    if (chosenField === 'material_cost') setMaterialCost(String(val));
    else if (chosenField === 'labour_cost') setLabourCost(String(val));
    else if (chosenField === 'other_expenses') setOtherExpenses(String(val));

    setAmbiguityState(null);
    if (recommendation) setIsOutdated(true);
  };

  const handleCalculateFairPrice = async () => {
    try {
      setIsCalculating(true);
      setVoiceNotice(null);

      const payload = {
        productId,
        name: productData.name,
        category: productData.category,
        subcategory: productData.subcategory,
        material: productData.material,
        craft_type: productData.craft_type,
        features: productData.features,
        existing_price: productData.price,
        material_cost: materialCost ? parseFloat(materialCost) : null,
        labour_cost: labourCost ? parseFloat(labourCost) : null,
        other_expenses: otherExpenses ? parseFloat(otherExpenses) : null,
        production_time: productionTime ? parseFloat(productionTime) : null,
        production_time_unit: productionTimeUnit,
      };

      const res = await recommendFairPrice(payload, activeLanguage);
      setRecommendation(res);
      setIsOutdated(false);
      setRecommendationStatus('none');
    } catch (err: any) {
      setVoiceNotice('Fair price recommendation is temporarily unavailable. You can set selling price manually.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApplyRecommendedPrice = () => {
    if (recommendation && recommendation.suggested_price && onApplyRecommendedPrice) {
      onApplyRecommendedPrice(recommendation.suggested_price);
      setRecommendationStatus('applied');
    }
  };

  const handleKeepMyPrice = () => {
    setRecommendationStatus('kept');
  };

  const langLabels: Record<PricingLanguage, string> = {
    en: 'English',
    ta: 'தமிழ்',
    hi: 'हिन्दी',
  };

  return (
    <div
      className="m63-card mb-6"
      style={{
        border: '1.5px solid #F59E0B',
        backgroundColor: 'var(--m63-bg-surface)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF' }}>
              <Sparkles size={18} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
              ✨ Smart Fair Pricing Intelligence
            </h2>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Evidence Engine
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '4px' }}>
            Understand your production costs and get an AI-assisted fair-price recommendation based on marketplace evidence.
          </p>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(['en', 'ta', 'hi'] as PricingLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLanguage(lang)}
              style={{
                border: activeLanguage === lang ? '1.5px solid #F59E0B' : '1px solid var(--m63-border)',
                backgroundColor: activeLanguage === lang ? '#FEF3C7' : 'var(--m63-bg-canvas)',
                color: activeLanguage === lang ? '#92400E' : 'var(--m63-slate)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: activeLanguage === lang ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {langLabels[lang]}
            </button>
          ))}
        </div>
      </div>

      {voiceNotice && (
        <div className="mt-2 mb-4 p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Cost Inputs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Material Cost */}
        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '6px' }}>
            <span>Material Cost (₹)</span>
            <button
              type="button"
              onClick={() => (isRecording && activeRecordingField === 'material_cost' ? stopRecording() : startRecording('material_cost'))}
              title="Speak Material Cost"
              style={{
                background: isRecording && activeRecordingField === 'material_cost' ? '#FEE2E2' : '#FEF3C7',
                color: isRecording && activeRecordingField === 'material_cost' ? '#DC2626' : '#D97706',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isRecording && activeRecordingField === 'material_cost' ? <Square size={12} /> : <Mic size={12} />}
              <span>{isRecording && activeRecordingField === 'material_cost' ? 'Recording...' : '🎙 Speak'}</span>
            </button>
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 500"
            value={materialCost}
            onChange={(e) => handleInputChange(setMaterialCost, e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--m63-border)',
              backgroundColor: 'var(--m63-bg-canvas)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Labour Cost */}
        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '6px' }}>
            <span>Labour Cost (₹)</span>
            <button
              type="button"
              onClick={() => (isRecording && activeRecordingField === 'labour_cost' ? stopRecording() : startRecording('labour_cost'))}
              title="Speak Labour Cost"
              style={{
                background: isRecording && activeRecordingField === 'labour_cost' ? '#FEE2E2' : '#FEF3C7',
                color: isRecording && activeRecordingField === 'labour_cost' ? '#DC2626' : '#D97706',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isRecording && activeRecordingField === 'labour_cost' ? <Square size={12} /> : <Mic size={12} />}
              <span>{isRecording && activeRecordingField === 'labour_cost' ? 'Recording...' : '🎙 Speak'}</span>
            </button>
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 300"
            value={labourCost}
            onChange={(e) => handleInputChange(setLabourCost, e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--m63-border)',
              backgroundColor: 'var(--m63-bg-canvas)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Other Expenses */}
        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '6px' }}>
            <span>Other Expenses (₹)</span>
            <button
              type="button"
              onClick={() => (isRecording && activeRecordingField === 'other_expenses' ? stopRecording() : startRecording('other_expenses'))}
              title="Speak Other Expenses"
              style={{
                background: isRecording && activeRecordingField === 'other_expenses' ? '#FEE2E2' : '#FEF3C7',
                color: isRecording && activeRecordingField === 'other_expenses' ? '#DC2626' : '#D97706',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isRecording && activeRecordingField === 'other_expenses' ? <Square size={12} /> : <Mic size={12} />}
              <span>{isRecording && activeRecordingField === 'other_expenses' ? 'Recording...' : '🎙 Speak'}</span>
            </button>
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 100"
            value={otherExpenses}
            onChange={(e) => handleInputChange(setOtherExpenses, e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--m63-border)',
              backgroundColor: 'var(--m63-bg-canvas)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Production Time */}
        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '6px' }}>
            <span>Production Time</span>
            <button
              type="button"
              onClick={() => (isRecording && activeRecordingField === 'production_time' ? stopRecording() : startRecording('production_time'))}
              title="Speak Production Time"
              style={{
                background: isRecording && activeRecordingField === 'production_time' ? '#FEE2E2' : '#FEF3C7',
                color: isRecording && activeRecordingField === 'production_time' ? '#DC2626' : '#D97706',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isRecording && activeRecordingField === 'production_time' ? <Square size={12} /> : <Mic size={12} />}
              <span>{isRecording && activeRecordingField === 'production_time' ? 'Recording...' : '🎙 Speak'}</span>
            </button>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              min="0"
              placeholder="e.g. 3"
              value={productionTime}
              onChange={(e) => handleInputChange(setProductionTime, e.target.value)}
              style={{
                width: '60%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            />
            <select
              value={productionTimeUnit}
              onChange={(e) => handleInputChange(setProductionTimeUnit as any, e.target.value)}
              style={{
                width: '40%',
                padding: '8px 6px',
                borderRadius: '8px',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Known Production Cost Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF3C7', padding: '10px 16px', borderRadius: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={16} className="text-amber-700" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E' }}>
            Known Production Cost: ₹{knownCost.toLocaleString('en-IN')}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
          Material (₹{matNum}) + Labour (₹{labNum}) + Other (₹{othNum})
        </span>
      </div>

      {/* Voice Review Card */}
      {voiceReviewData && editableVoiceFields && (
        <div style={{ backgroundColor: '#F0F9FF', border: '1.5px solid #0EA5E9', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mic size={16} className="text-sky-600" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0369A1' }}>
                🎙 Voice Input Review
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 600 }}>
              Extracted from speech ({voiceReviewData.language.toUpperCase()})
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#0369A1', marginBottom: '12px' }}>
            "{voiceReviewData.transcript}"
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369A1' }}>Material Cost (₹)</label>
              <input
                type="number"
                value={editableVoiceFields.material_cost != null ? String(editableVoiceFields.material_cost) : ''}
                onChange={(e) => setEditableVoiceFields((prev) => prev ? { ...prev, material_cost: e.target.value ? Number(e.target.value) : null } : null)}
                placeholder="Not provided"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #7DD3FC', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369A1' }}>Labour Cost (₹)</label>
              <input
                type="number"
                value={editableVoiceFields.labour_cost != null ? String(editableVoiceFields.labour_cost) : ''}
                onChange={(e) => setEditableVoiceFields((prev) => prev ? { ...prev, labour_cost: e.target.value ? Number(e.target.value) : null } : null)}
                placeholder="Not provided"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #7DD3FC', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369A1' }}>Other Expenses (₹)</label>
              <input
                type="number"
                value={editableVoiceFields.other_expenses != null ? String(editableVoiceFields.other_expenses) : ''}
                onChange={(e) => setEditableVoiceFields((prev) => prev ? { ...prev, other_expenses: e.target.value ? Number(e.target.value) : null } : null)}
                placeholder="Not provided"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #7DD3FC', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369A1' }}>Production Time</label>
              <input
                type="number"
                value={editableVoiceFields.production_time != null ? String(editableVoiceFields.production_time) : ''}
                onChange={(e) => setEditableVoiceFields((prev) => prev ? { ...prev, production_time: e.target.value ? Number(e.target.value) : null } : null)}
                placeholder="Not provided"
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #7DD3FC', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => { setVoiceReviewData(null); setEditableVoiceFields(null); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={handleConfirmVoiceReview}>
              Confirm Extracted Costs
            </Button>
          </div>
        </div>
      )}

      {/* Ambiguity Clarification Modal */}
      {ambiguityState && (
        <div style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', marginBottom: '8px' }}>
            <HelpCircle size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Voice Clarification Required</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#92400E', fontWeight: 600, marginBottom: '12px' }}>
            {ambiguityState.question}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" onClick={() => handleResolveAmbiguity('material_cost')}>
              Material Cost (₹{ambiguityState.value})
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleResolveAmbiguity('labour_cost')}>
              Labour Cost (₹{ambiguityState.value})
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleResolveAmbiguity('other_expenses')}>
              Other Expenses (₹{ambiguityState.value})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAmbiguityState(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Recalculate Warning Banner */}
      {(isOutdated || (recommendation && recommendation.known_cost != null && Math.abs(recommendation.known_cost - knownCost) > 0.01)) && recommendation && (
        <div className="mb-4 p-3 rounded-lg text-xs bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={16} className="text-amber-700 shrink-0" />
            <span>Your cost inputs changed. Recalculate to update the recommendation.</span>
          </div>
          <Button size="sm" variant="primary" icon={<RotateCcw size={14} />} onClick={handleCalculateFairPrice} loading={isCalculating}>
            Recalculate
          </Button>
        </div>
      )}

      {/* Calculate / Recalculate Fair Price Trigger Button */}
      <Button
        type="button"
        variant="primary"
        size="md"
        icon={<Sparkles size={16} />}
        onClick={handleCalculateFairPrice}
        loading={isCalculating}
        disabled={isProcessingVoice || isRecording}
        style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700 }}
      >
        {isCalculating
          ? 'Analyzing costs & evidence...'
          : recommendation
          ? '🔄 Recalculate Fair Price'
          : '✨ Calculate Fair Price'}
      </Button>

      {/* AI Recommendation Output Card */}
      {recommendation && (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--m63-border)', paddingTop: '18px' }} className="animate-fade-in">
          {/* Product Information Conflict Notice Gate */}
          {recommendation.product_validation?.has_conflicts && (
            <div style={{ backgroundColor: '#FFF1F2', border: '1.5px solid #F43F5E', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BE123C', fontWeight: 800, fontSize: '0.9rem', marginBottom: '6px' }}>
                <AlertCircle size={18} />
                <span>PRODUCT INFORMATION CONFLICT DETECTED</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#9F1239', fontWeight: 600, marginBottom: '8px' }}>
                {recommendation.product_validation.notice || 'Some product details appear inconsistent. Please verify the highlighted information before generating a fair-price recommendation.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recommendation.product_validation.conflicts.map((c, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#881337', backgroundColor: '#FFE4E6', padding: '6px 10px', borderRadius: '6px' }}>
                    <strong>[{c.type}]</strong> {c.description} — <em>{c.recommendation}</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Artisan Pricing Experience Card */}
          {(() => {
            const t = UI_STRINGS[activeLanguage] || UI_STRINGS.en;
            const marketRef = recommendation.calculation_breakdown?.weighted_market_price;
            const costPrice = recommendation.calculation_breakdown?.cost_based_price ?? (recommendation.known_cost * 1.25);
            const isCostProtected = recommendation.calculation_breakdown?.is_cost_floor_active || (marketRef != null && marketRef < costPrice);
            const marketRefStr = marketRef != null ? marketRef.toLocaleString('en-IN') : '—';
            const costPriceStr = Math.round(costPrice).toLocaleString('en-IN');
            const recPriceStr = (recommendation.suggested_price || Math.round(costPrice)).toLocaleString('en-IN');
            const knownCostStr = recommendation.known_cost.toLocaleString('en-IN');
            const eligibleComps = recommendation.selected_comparables ? recommendation.selected_comparables.filter((c) => c.benchmark_eligible) : [];

            return (
              <>
                {/* Header & Language Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
                    {t.header}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                      {eligibleComps.length > 0 ? `${eligibleComps.length} similar products found` : t.limitedMarketEvidence}
                    </span>
                    <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={handleCalculateFairPrice} loading={isCalculating}>
                      Recalculate
                    </Button>
                  </div>
                </div>

                {/* Primary Hero Recommendation Card */}
                <div style={{ backgroundColor: '#ECFDF5', border: '2px solid #059669', borderRadius: '16px', padding: '20px', marginBottom: '18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065F46', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {t.recommendedPriceLabel}
                  </span>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#047857', margin: '6px 0' }}>
                    ₹{recPriceStr}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#D1FAE5', padding: '4px 12px', borderRadius: '20px' }}>
                    {isCostProtected ? t.priceProtectsCosts : t.marketAlignedPrice}
                  </div>
                </div>

                {/* 3 Core Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  {/* Your Product Cost */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                      {t.yourProductCost}
                    </span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1E293B', marginTop: '4px', marginBottom: 0 }}>
                      ₹{knownCostStr}
                    </p>
                  </div>

                  {/* Minimum Selling Price */}
                  <div style={{ backgroundColor: '#FEF3C7', padding: '14px', borderRadius: '12px', border: '1px solid #FCD34D' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                      {t.minimumSellingPrice}
                    </span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#78350F', marginTop: '4px', marginBottom: '2px' }}>
                      ₹{costPriceStr}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: '#B45309', fontWeight: 600 }}>
                      {t.includesMarkup}
                    </span>
                  </div>

                  {/* Prices Seen For Similar Products */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {t.pricesSeenSimilar}
                    </span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#334155', marginTop: '4px', marginBottom: '2px' }}>
                      {marketRef != null ? `Around ₹${marketRefStr}` : t.limitedMarketEvidence}
                    </p>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                      {t.pricesSeenSubtext}
                    </span>
                  </div>
                </div>

                {/* Market-Cost Mismatch Warning Box */}
                {isCostProtected && (
                  <div style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 800, fontSize: '0.88rem', marginBottom: '6px' }}>
                      <AlertCircle size={18} className="text-amber-600 shrink-0" />
                      <span>{t.costHigherTitle}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#92400E', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                      {t.costHigherBody(marketRefStr, costPriceStr)}
                    </p>
                  </div>
                )}

                {/* WHY THIS PRICE? Section */}
                <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {t.whyThisPriceTitle}
                  </span>
                  <p style={{ fontSize: '0.88rem', color: '#581C87', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                    {isCostProtected
                      ? t.whyThisPriceBodyCostProtected(knownCostStr, marketRefStr, costPriceStr)
                      : t.whyThisPriceBodyMarketAligned(knownCostStr, marketRefStr, recPriceStr)}
                  </p>
                </div>

                {/* COMPARABLE PRODUCTS (Approved Card Format with Expandable Why is it similar?) */}
                {eligibleComps.length > 0 && (
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        {t.comparableProductsTitle}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                        {t.comparableProductsStats(
                          recommendation.calculation_breakdown?.total_candidates_count || eligibleComps.length + (recommendation.excluded_comparables?.length || 0),
                          eligibleComps.length,
                          recommendation.calculation_breakdown?.contextual_excluded_count || (recommendation.excluded_comparables?.length || 0)
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', fontStyle: 'italic', marginBottom: '10px' }}>
                        {t.comparableProductsSubtext}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {t.usedForPricingTitle}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {eligibleComps.map((comp) => {
                        const isExpanded = !!expandedCardIds[comp.productId];
                        const influenceLevel = comp.priceInfluenceLevel || comp.priceInfluence || 'VERY_HIGH';
                        const formattedInfluence = influenceLevel === 'VERY_HIGH' ? 'Very High' : influenceLevel === 'HIGH' ? 'High' : influenceLevel === 'MEDIUM' ? 'Medium' : 'Low';
                        const matchedText = comp.matchedAttributes && comp.matchedAttributes.length > 0 ? comp.matchedAttributes.join(' • ') : 'Product type match • Intended use • Similar material';

                        return (
                          <div
                            key={comp.productId}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '10px',
                              padding: '14px 16px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            {/* Card Top Row: Product Name, Similarity %, Price */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                                {comp.productName}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '12px' }}>
                                  {comp.similarityPercentage}% similar
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1E293B' }}>
                                  ₹{comp.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Matched Summary Line */}
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '6px', lineHeight: 1.4 }}>
                              <strong style={{ color: '#334155' }}>{t.matchedLabel}:</strong> {matchedText}
                            </div>

                            {/* Price Influence Line */}
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '10px', lineHeight: 1.4 }}>
                              <strong style={{ color: '#334155' }}>{t.priceInfluenceLabel}:</strong>{' '}
                              <span style={{ fontWeight: 700, color: '#047857' }}>{formattedInfluence}</span>
                              {comp.priceInfluenceExplanation ? ` — ${comp.priceInfluenceExplanation}` : ''}
                            </div>

                            {/* Expandable "Why is it similar?" Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCardIds((prev) => ({
                                  ...prev,
                                  [comp.productId]: !prev[comp.productId],
                                }))
                              }
                              aria-expanded={isExpanded}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '4px 0',
                                color: '#D97706',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{t.whyIsItSimilar}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {/* Expanded Explanation Content */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: '12px',
                                  paddingTop: '12px',
                                  borderTop: '1px dashed #E2E8F0',
                                  backgroundColor: '#FAFAFA',
                                  padding: '12px',
                                  borderRadius: '8px',
                                }}
                              >
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                  {t.whyIsItSimilarHeader}
                                </div>

                                {/* Detailed Attribute Breakdown Checklist */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {t.productTypeLabel}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                      {t.productTypeVal}
                                    </div>
                                  </div>

                                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {t.intendedUseLabel}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                      {t.intendedUseVal}
                                    </div>
                                  </div>

                                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {t.materialLabel}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                      {comp.matchedAttributes?.find((a) => a.toLowerCase().includes('material'))
                                        ? `✓ ${comp.matchedAttributes.find((a) => a.toLowerCase().includes('material'))}`
                                        : t.materialVal}
                                    </div>
                                  </div>

                                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {t.craftLabel}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                      {comp.matchedAttributes?.find((a) => a.toLowerCase().includes('craft'))
                                        ? `✓ ${comp.matchedAttributes.find((a) => a.toLowerCase().includes('craft'))}`
                                        : t.craftVal}
                                    </div>
                                  </div>

                                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {t.quantityLabel}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>
                                      {t.quantityVal}
                                    </div>
                                  </div>
                                </div>

                                {/* Difference Section (Only rendered if supported by backend differing attributes data) */}
                                {comp.differingAttributes && comp.differingAttributes.length > 0 && (
                                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '8px' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
                                      {t.differenceHeader}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {comp.differingAttributes.map((diffItem, idx) => (
                                        <div key={idx} style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                                          • {diffItem}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expandable Price Details */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '18px' }}>
                  <button
                    type="button"
                    onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#F8FAFC',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={15} className="text-amber-600" />
                      <span>{isReasoningExpanded ? t.hideDetails : t.seeDetails}</span>
                    </div>
                    {isReasoningExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isReasoningExpanded && (
                    <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Production cost</span>
                        <span style={{ color: '#1E293B', fontWeight: 800 }}>₹{knownCostStr}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Chosen markup</span>
                        <span style={{ color: '#1E293B', fontWeight: 800 }}>25%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Minimum selling price</span>
                        <span style={{ color: '#78350F', fontWeight: 800 }}>₹{costPriceStr}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Similar products</span>
                        <span style={{ color: '#334155', fontWeight: 800 }}>Around ₹{marketRefStr}</span>
                      </div>
                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#047857', fontWeight: 800 }}>Recommended price</span>
                        <span style={{ color: '#047857', fontWeight: 900 }}>₹{recPriceStr}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Expandable "How M63 Decided" Section */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#F8FAFC',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={15} className="text-amber-600" />
                <span>🔍 How M63 Decided (Reasoning Flow)</span>
              </div>
              {isReasoningExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isReasoningExpanded && recommendation.reasoning_flow && (
              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {recommendation.reasoning_flow.map((stepItem) => (
                    <div key={stepItem.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {stepItem.step}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                          {stepItem.title} <span style={{ fontWeight: 600, color: '#64748B' }}>({stepItem.summary})</span>
                        </h4>
                        {stepItem.details && stepItem.details.length > 0 && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                            {stepItem.details.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Use Recommended Price vs Keep My Price */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Check size={16} />}
              onClick={handleApplyRecommendedPrice}
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none', color: '#FFFFFF', fontWeight: 700 }}
            >
              {recommendationStatus === 'applied' ? '✓ Price Applied to Form' : '✨ Use Recommended Price'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleKeepMyPrice}
            >
              {recommendationStatus === 'kept' ? '✓ Kept My Price' : 'Keep My Price'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
