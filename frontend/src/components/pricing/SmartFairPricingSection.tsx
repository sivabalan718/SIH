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
  TrendingUp,
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--m63-slate)', margin: 0 }}>
              ✨ M63 Smart Fair Pricing Intelligence
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: recommendation.confidence === 'high' ? '#D1FAE5' : recommendation.confidence === 'medium' ? '#FEF3C7' : '#FEE2E2',
                  color: recommendation.confidence === 'high' ? '#065F46' : recommendation.confidence === 'medium' ? '#92400E' : '#991B1B',
                }}
              >
                Confidence: {recommendation.confidence.toUpperCase()}
              </span>
              <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={handleCalculateFairPrice} loading={isCalculating}>
                Recalculate
              </Button>
            </div>
          </div>

          {/* Artisan Price Comparison Banner */}
          {recommendation.comparison_with_artisan_price && recommendation.comparison_with_artisan_price.artisan_price ? (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>YOUR CURRENT PRICE</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155', margin: '2px 0 0 0' }}>
                    ₹{recommendation.comparison_with_artisan_price.artisan_price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>M63 RECOMMENDED</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', margin: '2px 0 0 0' }}>
                    ₹{recommendation.suggested_price?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>FAIR RANGE</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400E', margin: '2px 0 0 0' }}>
                    ₹{recommendation.fair_price_min?.toLocaleString('en-IN')} – ₹{recommendation.fair_price_max?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {recommendation.comparison_with_artisan_price.message && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: recommendation.comparison_with_artisan_price.position_status === 'below' && recommendation.comparison_with_artisan_price.message.includes('WARNING') ? '#FEF2F2' : '#F1F5F9',
                    border: recommendation.comparison_with_artisan_price.position_status === 'below' && recommendation.comparison_with_artisan_price.message.includes('WARNING') ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
                    color: recommendation.comparison_with_artisan_price.position_status === 'below' && recommendation.comparison_with_artisan_price.message.includes('WARNING') ? '#991B1B' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} className={recommendation.comparison_with_artisan_price.position_status === 'below' && recommendation.comparison_with_artisan_price.message.includes('WARNING') ? 'text-red-600 shrink-0' : 'text-slate-600 shrink-0'} />
                  <span>{recommendation.comparison_with_artisan_price.message}</span>
                </div>
              )}
            </div>
          ) : (
            /* Standard Range Display */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#FEF3C7', padding: '14px', borderRadius: '12px', border: '1px solid #FCD34D' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Fair Price Range</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#78350F', marginTop: '4px' }}>
                  ₹{recommendation.fair_price_min?.toLocaleString('en-IN') || '—'} – ₹{recommendation.fair_price_max?.toLocaleString('en-IN') || '—'}
                </p>
              </div>

              <div style={{ backgroundColor: '#ECFDF5', padding: '14px', borderRadius: '12px', border: '1px solid #6EE7B7' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Suggested Selling Price</span>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                  ₹{recommendation.suggested_price?.toLocaleString('en-IN') || '—'}
                </p>
              </div>
            </div>
          )}

          {/* WHY THIS PRICE? Explanation */}
          {(recommendation.price_justification || recommendation.explanation) && (
            <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} /> WHY THIS PRICE?
              </span>
              <p style={{ fontSize: '0.88rem', color: '#581C87', lineHeight: 1.5, marginTop: '6px', fontWeight: 500 }}>
                {recommendation.price_justification || recommendation.explanation}
              </p>
            </div>
          )}

          {/* Factors Considered & Evidence Used */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            {/* Factors */}
            {recommendation.factors_considered && recommendation.factors_considered.length > 0 && (
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} className="text-emerald-600" /> FACTORS CONSIDERED
                </span>
                <ul style={{ paddingLeft: '16px', margin: '8px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                  {recommendation.factors_considered.map((f, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence Used */}
            {recommendation.evidence_used && (
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} className="text-sky-600" /> MARKET EVIDENCE
                </span>
                {recommendation.calculation_breakdown?.eligible_comparable_count ? (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>• <strong>{recommendation.calculation_breakdown.eligible_comparable_count} eligible comparable{recommendation.calculation_breakdown.eligible_comparable_count > 1 ? 's' : ''}</strong></div>
                    <div>• Similarity-weighted market reference: <strong>₹{recommendation.calculation_breakdown.weighted_market_price?.toLocaleString('en-IN') ?? '—'}</strong></div>
                    <div>• Observed prices: <strong>{recommendation.evidence_used.price_range_str || '—'}</strong></div>
                    <div>• Observed marketplace comparables</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>• <strong>No sufficiently similar products found</strong></div>
                    <div>• Market reference: <strong>Not available</strong></div>
                    <div>• Recommendation based on production cost</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparable Product Analysis Card */}
          {recommendation.selected_comparables && recommendation.selected_comparables.length > 0 ? (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} className="text-amber-600" /> COMPARABLE PRODUCTS
                </span>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', margin: '4px 0 0 0' }}>
                  {recommendation.calculation_breakdown?.total_candidates_count ?? recommendation.selected_comparables.length} products analyzed • {recommendation.calculation_breakdown?.eligible_comparable_count ?? recommendation.selected_comparables.filter((c) => c.benchmark_eligible).length} used for pricing • {recommendation.calculation_breakdown?.contextual_excluded_count ?? recommendation.selected_comparables.filter((c) => !c.benchmark_eligible).length} excluded
                </p>
                <p style={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#475569', marginTop: '4px' }}>
                  Market reference is weighted by product similarity — more similar products have greater influence.
                </p>
              </div>

              {/* Eligible Comparables: USED FOR PRICING */}
              {recommendation.selected_comparables.filter((c) => c.benchmark_eligible).length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', marginBottom: '6px', textTransform: 'uppercase' }}>
                    🟢 USED FOR PRICING
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recommendation.selected_comparables.filter((c) => c.benchmark_eligible).map((comp) => (
                      <div key={comp.productId} style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>{comp.productName}</span>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginTop: '2px' }}>
                              {comp.similarityPercentage}% similar • ₹{comp.price.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#D1FAE5', color: '#047857' }}>
                            USED FOR PRICING
                          </span>
                        </div>
                        {/* Matched attributes */}
                        {comp.matchedAttributes && comp.matchedAttributes.length > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#475569', borderTop: '1px solid #F1F5F9', paddingTop: '5px' }}>
                            <strong style={{ color: '#334155' }}>Matched:</strong> {comp.matchedAttributes.join(' • ')}
                          </div>
                        )}
                        {/* Price influence */}
                        {comp.priceInfluenceExplanation && (
                          <div style={{ fontSize: '0.71rem', color: '#15803D', fontWeight: 500 }}>
                            <strong style={{ color: '#166534' }}>Price influence:</strong> {comp.priceInfluenceExplanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual Comparables: NOT USED FOR PRICING */}
              {recommendation.selected_comparables.filter((c) => !c.benchmark_eligible).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309', marginBottom: '2px', textTransform: 'uppercase' }}>
                    🟠 CONTEXTUAL ONLY
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#78350F', marginBottom: '6px' }}>
                    Contextual reference — not included in benchmark pricing.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recommendation.selected_comparables.filter((c) => !c.benchmark_eligible).map((comp) => (
                      <div key={comp.productId} style={{ backgroundColor: '#FFFFFF', border: '1px solid #FED7AA', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>{comp.productName}</span>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', marginTop: '2px' }}>
                              {comp.similarityPercentage}% similar • ₹{comp.price.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FFEDD5', color: '#9A3412' }}>
                            NOT USED FOR PRICING
                          </span>
                        </div>
                        {/* Matched attributes */}
                        {comp.matchedAttributes && comp.matchedAttributes.length > 0 && (
                          <div style={{ fontSize: '0.73rem', color: '#475569', borderTop: '1px solid #FFF7ED', paddingTop: '5px' }}>
                            <strong style={{ color: '#334155' }}>Matched:</strong> {comp.matchedAttributes.join(' • ')}
                          </div>
                        )}
                        {/* Price influence */}
                        {comp.priceInfluenceExplanation && (
                          <div style={{ fontSize: '0.71rem', color: '#9A3412', fontWeight: 500 }}>
                            <strong style={{ color: '#7C2D12' }}>Price influence:</strong> {comp.priceInfluenceExplanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            recommendation.pricing_basis === 'COST_ANCHORED' && (
              <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.82rem', color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} className="text-amber-600 shrink-0" />
                <span>No sufficiently similar products found. Recommendation based on production cost.</span>
              </div>
            )
          )}

          {/* How M63 Calculated The Price Card */}
          {recommendation.calculation_breakdown && (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📐 HOW M63 CALCULATED THE PRICE
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px' }}>
                  PRICE CALCULATION BREAKDOWN
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '520px', margin: '0 auto' }}>
                {/* 1. Production Cost */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Production Cost</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    {recommendation.calculation_breakdown.known_production_cost !== null ? `₹${recommendation.calculation_breakdown.known_production_cost.toLocaleString('en-IN')}` : 'Not provided'}
                  </span>
                </div>

                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1 }}>↓</div>

                {/* 2. Sustainable Price Floor (25% markup) */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>Sustainable Price Floor (25% markup)</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                    +₹{recommendation.calculation_breakdown.base_margin.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 3. Craft Adjustment (Only if > 0) */}
                {(recommendation.calculation_breakdown.craft_adjustment ?? 0) > 0 && (
                  <>
                    <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1 }}>↓</div>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>Craft Adjustment</span>
                        {recommendation.calculation_breakdown.craft_factor_breakdown && recommendation.calculation_breakdown.craft_factor_breakdown.length > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                            {recommendation.calculation_breakdown.craft_factor_breakdown.join(' • ')}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                        +₹{recommendation.calculation_breakdown.craft_adjustment!.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                )}

                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1 }}>↓</div>

                {/* 4. Cost-Based Price */}
                <div style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Cost-Based Price</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    ₹{(recommendation.calculation_breakdown.cost_based_price ?? (recommendation.calculation_breakdown.known_production_cost! + recommendation.calculation_breakdown.base_margin + (recommendation.calculation_breakdown.craft_adjustment ?? 0))).toLocaleString('en-IN')}
                  </span>
                </div>

                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1 }}>↓</div>

                {/* 5. Market Alignment */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #FED7AA', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C2410C' }}>Market Alignment</span>
                    {recommendation.calculation_breakdown.weighted_market_price != null && (
                      <div style={{ fontSize: '0.68rem', color: '#7C2D12', marginTop: '2px', lineHeight: 1.4 }}>
                        <div>Observed similarity-weighted market reference: ₹{recommendation.calculation_breakdown.weighted_market_price.toLocaleString('en-IN')}</div>
                        <div>
                          {recommendation.calculation_breakdown.eligible_comparable_count === 1
                            ? `Limited market evidence → ${recommendation.calculation_breakdown.market_evidence_weight_pct ?? 15}% market influence`
                            : recommendation.calculation_breakdown.market_evidence_weight_pct != null
                            ? `Market evidence (${recommendation.calculation_breakdown.eligible_comparable_count} comparables) → ${recommendation.calculation_breakdown.market_evidence_weight_pct}% market influence`
                            : `Aligned toward similarity-weighted market reference of ₹${recommendation.calculation_breakdown.weighted_market_price.toLocaleString('en-IN')}`}
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: recommendation.calculation_breakdown.market_evidence_adjustment >= 0 ? '#047857' : '#C2410C' }}>
                    {recommendation.calculation_breakdown.market_evidence_adjustment >= 0
                      ? `+₹${recommendation.calculation_breakdown.market_evidence_adjustment.toLocaleString('en-IN')}`
                      : `−₹${Math.abs(recommendation.calculation_breakdown.market_evidence_adjustment).toLocaleString('en-IN')}`}
                  </span>
                </div>

                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1 }}>↓</div>

                {/* 6. M63 RECOMMENDED PRICE */}
                <div style={{ backgroundColor: '#ECFDF5', border: '2px solid #059669', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>M63 RECOMMENDED PRICE</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>
                    ₹{recommendation.calculation_breakdown.suggested_price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#047857' }}>
                ✓ Price will never fall below verified production cost.
              </div>
            </div>
          )}

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
