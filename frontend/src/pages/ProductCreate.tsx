import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { CRAFT_CATEGORIES } from '../data/categories.js';
import { createProduct, updateProduct, getProduct, uploadProductImage, publishProduct } from '../services/productService.js';
import { processVoiceToProduct, validateProductImage, enhanceProductImage } from '../services/aiService.js';
import { SupportedQuestionLanguage, QUESTION_LOCALIZATIONS } from '../data/questionLocalizations.js';
import { Input } from '../components/ui/Input.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { ImageUpload } from '../components/product/ImageUpload.js';
import { ImageEnhanceComparison } from '../components/product/ImageEnhanceComparison.js';
import { SmartStudioSettingsModal } from '../components/product/SmartStudioSettingsModal.js';
import { SmartCatalogueSection } from '../components/product/SmartCatalogueSection.js';
import { SmartFairPricingSection } from '../components/pricing/SmartFairPricingSection.js';
import { savePricingState, getPricingState } from '../services/pricingService.js';
import { CatalogueLanguage, CatalogueStyle, GeneratedCatalogueContent, getCatalogue, saveCatalogue } from '../services/catalogueService.js';
import { FeatureTagInput } from '../components/product/FeatureTagInput.js';
import { FieldVoiceRecorder } from '../components/voice/FieldVoiceRecorder.js';
import { CameraCaptureModal } from '../components/camera/CameraCaptureModal.js';
import { ProductReview } from './ProductReview.js';
import {
  Package,
  Layers,
  IndianRupee,
  ArrowLeft,
  Eye,
  Save,
  Rocket,
  AlertCircle,
  Camera,
  Globe,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';

export const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { productId: routeProductId } = useParams<{ productId?: string }>();
  const [searchParams] = useSearchParams();
  const draftQueryId = searchParams.get('draftId');

  const editingProductId = routeProductId || draftQueryId || null;
  const [activeProductId, setActiveProductId] = useState<string | null>(editingProductId);

  // Language Selection
  const [questionLanguage, setQuestionLanguage] = useState<SupportedQuestionLanguage>('en');
  const loc = QUESTION_LOCALIZATIONS[questionLanguage];

  // View Mode: 'FORM' or 'REVIEW'
  const [viewMode, setViewMode] = useState<'FORM' | 'REVIEW'>('FORM');

  // AI Voice & Clarification State
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isAiAssisted, setIsAiAssisted] = useState(false);

  // Set of field names that were AI-suggested
  const [aiSuggestedFields, setAiSuggestedFields] = useState<Record<string, boolean>>({});

  // Field clarification state
  const [clarificationState, setClarificationState] = useState<Record<string, string | null>>({});

  // Unified Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    material: '',
    color: '',
    craft_type: '',
    features: [] as string[],
    price: '',
    stock_quantity: '1',
    production_time: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Phase 4: Image Validation & Enhancement State
  const [qualityRating, setQualityRating] = useState<'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  const [isValidProductImage, setIsValidProductImage] = useState<boolean>(true);
  const [isImprovingPhoto, setIsImprovingPhoto] = useState(false);
  const [enhancedImageBase64, setEnhancedImageBase64] = useState<string | null>(null);
  const [enhancedBlob, setEnhancedBlob] = useState<Blob | null>(null);
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [showStudioSettingsModal, setShowStudioSettingsModal] = useState(false);
  const [improvementsApplied, setImprovementsApplied] = useState<string[]>([]);
  const [photoNoticeMessage, setPhotoNoticeMessage] = useState<string | null>(null);

  // Phase 5: Smart Catalogue State & Style
  const [catalogueMap, setCatalogueMap] = useState<Record<CatalogueLanguage, GeneratedCatalogueContent | null>>({
    en: null,
    ta: null,
    hi: null,
  });
  const [catalogueStyle, setCatalogueStyle] = useState<CatalogueStyle>('PROFESSIONAL');
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState<boolean>(false);

  // Phase 6: Smart Fair Pricing State
  const [pricingState, setPricingState] = useState<any>(null);

  // UI feedback states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [autosavedTime, setAutosavedTime] = useState<string | null>(null);

  const resetFormState = () => {
    setActiveProductId(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      material: '',
      color: '',
      craft_type: '',
      features: [],
      price: '',
      stock_quantity: '1',
      production_time: '',
    });
    setSelectedFile(null);
    setCurrentImageUrl(null);
    setOriginalImageUrl(null);
    setQualityRating(null);
    setValidationFeedback(null);
    setIsValidProductImage(true);
    setIsImprovingPhoto(false);
    setEnhancedImageBase64(null);
    setEnhancedBlob(null);
    setShowEnhanceModal(false);
    setPhotoNoticeMessage(null);
    setVoiceTranscript(null);
    setDetectedLanguage(null);
    setIsAiAssisted(false);
    setAiSuggestedFields({});
    setClarificationState({});
    setFieldErrors({});
    setGeneralError(null);
    setSaveSuccessMessage(null);
    setAutosavedTime(null);
    setViewMode('FORM');
    // CLEAN RESET OF CATALOGUE STATE
    setCatalogueMap({ en: null, ta: null, hi: null });
    setCatalogueStyle('PROFESSIONAL');
    setIsLoadingCatalogue(false);
    // CLEAN RESET OF PRICING STATE
    setPricingState(null);
  };

  // Load existing draft if editingProductId is present, or reset for new product
  useEffect(() => {
    if (editingProductId) {
      loadDraftProduct(editingProductId);
    } else {
      resetFormState();
    }
  }, [editingProductId]);

  const loadDraftProduct = async (id: string) => {
    try {
      setIsLoadingCatalogue(true);
      setGeneralError(null);
      const product = await getProduct(id);
      setActiveProductId(product.id);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        material: product.material || '',
        color: product.color || '',
        craft_type: product.craftType || '',
        features: product.features || [],
        price: product.price > 0 ? product.price.toString() : '',
        stock_quantity: product.stockQuantity ? product.stockQuantity.toString() : '1',
        production_time: (product as any).productionTime || '',
      });
      if (product.primaryImageUrl) setCurrentImageUrl(product.primaryImageUrl);
      if (product.originalImageUrl) setOriginalImageUrl(product.originalImageUrl);

      try {
        const catRes = await getCatalogue(id);
        if (catRes && catRes.catalogues) {
          setCatalogueMap(catRes.catalogues);
          if (catRes.style) setCatalogueStyle(catRes.style);
        }
      } catch (e) {
        // Ignore if catalogue not previously generated
      }

      try {
        const pricingRes = await getPricingState(id);
        if (pricingRes && pricingRes.pricing) {
          setPricingState(pricingRes.pricing);
        }
      } catch (e) {
        // Ignore if pricing state not previously generated
      } finally {
        setIsLoadingCatalogue(false);
      }
    } catch (err: any) {
      setIsLoadingCatalogue(false);
      const msg = err.response?.data?.error?.message || err.message || 'Could not load draft product.';
      setGeneralError(msg);
      setTimeout(() => navigate('/artisan/products'), 2500);
    }
  };

  // Debounced Autosave to localStorage (scoped to active user & product ID)
  useEffect(() => {
    if (!activeProductId) return;

    const timer = setTimeout(() => {
      try {
        const storageKey = `m63_draft_${user?.id || 'anon'}_${activeProductId}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            formData,
            questionLanguage,
            aiSuggestedFields,
            catalogueMap,
            catalogueStyle,
          })
        );
        const now = new Date();
        setAutosavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        // Ignore storage errors
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, questionLanguage, aiSuggestedFields, catalogueMap, catalogueStyle, activeProductId, user?.id]);

  // Handle Photo Selection & Validate Image Content
  const handlePhotoSelected = async (file: File | null) => {
    setSelectedFile(file);
    setPhotoNoticeMessage(null);
    setEnhancedImageBase64(null);
    setEnhancedBlob(null);

    if (!file) {
      setQualityRating(null);
      setValidationFeedback(null);
      setIsValidProductImage(true);
      return;
    }

    try {
      const validation = await validateProductImage(file);
      setQualityRating(validation.qualityRating);
      setValidationFeedback(validation.feedbackMessage);
      setIsValidProductImage(validation.isValidProductImage);
    } catch (e) {
      setQualityRating('GOOD');
      setIsValidProductImage(true);
    }
  };

  // Handle Photo Enhancement Trigger - Opens Smart Studio Settings Modal
  const handleOpenStudioSettings = () => {
    if (!selectedFile) return;
    if (!isValidProductImage) {
      setPhotoNoticeMessage("This photo doesn't appear to show your craft product. Please upload or capture a clear product photo.");
      return;
    }
    setShowStudioSettingsModal(true);
  };

  // Execute Photo Enhancement with Selected Background Settings
  const handleImprovePhoto = async (bgOption: string = 'WHITE', colorHex?: string) => {
    if (!selectedFile) return;

    try {
      setIsImprovingPhoto(true);
      setPhotoNoticeMessage(null);

      const result = await enhanceProductImage(selectedFile, bgOption, colorHex);

      const targetEnhancedUrl = result.enhancedImageBase64 || result.enhancedImageUrl;
      if (result.enhancedAvailable && targetEnhancedUrl) {
        setEnhancedImageBase64(targetEnhancedUrl);
        setImprovementsApplied(result.improvementsApplied || []);
        setShowStudioSettingsModal(false);
        setShowEnhanceModal(true);

        try {
          const res = await fetch(targetEnhancedUrl);
          const blob = await res.blob();
          setEnhancedBlob(blob);
        } catch (e) {
          // Ignore blob conversion error if URL works directly
        }
      } else {
        setShowStudioSettingsModal(false);
        setPhotoNoticeMessage(
          result.message || 'Photo enhancement is currently unavailable. Your original photo is completely safe.'
        );
      }
    } catch (err: any) {
      setShowStudioSettingsModal(false);
      setPhotoNoticeMessage('AI photo enhancement is currently unavailable. Your original photo is completely safe.');
    } finally {
      setIsImprovingPhoto(false);
    }
  };

  // Accept Enhanced Image
  const handleSelectEnhanced = () => {
    if (enhancedImageBase64) {
      setCurrentImageUrl(enhancedImageBase64);
    }
    setShowEnhanceModal(false);
    setPhotoNoticeMessage('✨ Enhanced photo selected for catalogue listing.');
  };

  // Keep Original Image
  const handleSelectOriginal = () => {
    setShowEnhanceModal(false);
    setEnhancedBlob(null);
    setPhotoNoticeMessage('Original photo retained for catalogue listing.');
  };

  // Subcategories derived from chosen Category
  const subcategoryOptions = useMemo(() => {
    if (!formData.category) return [];
    const found = CRAFT_CATEGORIES.find((c) => c.name === formData.category);
    return found ? found.subcategories : [];
  }, [formData.category]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for field
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Clear clarification state if user edits field
    if (clarificationState[field]) {
      setClarificationState((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Field-level Voice Processing Handler
  const handleFieldAudioCaptured = async (audioBlob: Blob, targetField: string, browserTranscript?: string) => {
    try {
      setGeneralError(null);
      setClarificationState((prev) => ({ ...prev, [targetField]: null }));

      const aiResponse = await processVoiceToProduct(audioBlob, targetField, questionLanguage, browserTranscript);

      if (aiResponse.transcript) {
        setVoiceTranscript(aiResponse.transcript);
      }
      if (aiResponse.detectedLanguage) {
        setDetectedLanguage(aiResponse.detectedLanguage);
      }
      setIsAiAssisted(true);

      const extracted = aiResponse.extractedData;

      // Handle Ambiguity / Clarification State
      if (aiResponse.needsClarification || extracted.needs_clarification) {
        const msg =
          aiResponse.clarificationMessage ||
          extracted.clarification_message ||
          `M63 needs clarification for ${targetField}. Please confirm or type manually.`;
        setClarificationState((prev) => ({ ...prev, [targetField]: msg }));
      }

      // Update targeted form field(s) strictly with ENGLISH normalized data from Gemini
      let valueExtracted = false;

      setFormData((prev) => {
        const next = { ...prev };

        if (targetField === 'name' && extracted.product_name?.trim()) {
          next.name = extracted.product_name.trim();
          valueExtracted = true;
        } else if (targetField === 'description' && extracted.description?.trim()) {
          next.description = extracted.description.trim();
          valueExtracted = true;
        } else if (targetField === 'material' && extracted.material?.trim()) {
          next.material = extracted.material.trim();
          valueExtracted = true;
        } else if (targetField === 'craft_type' && extracted.craft_type?.trim()) {
          next.craft_type = extracted.craft_type.trim();
          valueExtracted = true;
        } else if (targetField === 'features' && extracted.features && extracted.features.length > 0) {
          const cleanFeatures = extracted.features.map((f) => f.trim()).filter(Boolean);
          if (cleanFeatures.length > 0) {
            next.features = Array.from(new Set([...prev.features, ...cleanFeatures]));
            valueExtracted = true;
          }
        } else if (targetField === 'price' && typeof extracted.price === 'number' && !isNaN(extracted.price) && extracted.price > 0) {
          next.price = extracted.price.toString();
          valueExtracted = true;
        } else if (targetField === 'stock' && typeof extracted.stock_quantity === 'number' && !isNaN(extracted.stock_quantity) && extracted.stock_quantity >= 0) {
          next.stock_quantity = extracted.stock_quantity.toString();
          valueExtracted = true;
        } else if (targetField === 'all') {
          if (extracted.product_name) next.name = extracted.product_name;
          if (extracted.description) next.description = extracted.description;
          if (extracted.category) next.category = extracted.category;
          if (extracted.material) next.material = extracted.material;
          if (extracted.craft_type) next.craft_type = extracted.craft_type;
          if (extracted.features) next.features = extracted.features;
          if (typeof extracted.price === 'number') next.price = extracted.price.toString();
          if (typeof extracted.stock_quantity === 'number') next.stock_quantity = extracted.stock_quantity.toString();
          valueExtracted = true;
        }

        return next;
      });

      if (valueExtracted) {
        setAiSuggestedFields((prev) => ({ ...prev, [targetField]: true }));
      } else {
        setClarificationState((prev) => ({
          ...prev,
          [targetField]: "Couldn't confidently extract this field.",
        }));
      }
    } catch (err: any) {
      const errMsg = err.message || "Couldn't confidently extract this field.";
      setClarificationState((prev) => ({
        ...prev,
        [targetField]: errMsg,
      }));
    }
  };

  const validateFormForDraft = () => {
    // Drafts allow partial input — only price and stock are checked if provided
    const errors: Record<string, string> = {};

    if (formData.price && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)) {
      errors.price = 'Please enter a valid price.';
    }

    if (formData.stock_quantity && (isNaN(parseInt(formData.stock_quantity, 10)) || parseInt(formData.stock_quantity, 10) < 0)) {
      errors.stock_quantity = 'Please enter a valid stock quantity.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Draft to database persistently
  const handleSaveDraft = async () => {
    if (!validateFormForDraft()) return;

    try {
      setIsSavingDraft(true);
      setGeneralError(null);
      setSaveSuccessMessage(null);

      const priceNum = parseFloat(formData.price) || 0;
      const stockNum = parseInt(formData.stock_quantity, 10) || 0;
      const nameToSave = formData.name.trim() || 'Untitled Product';

      let productIdToUse = activeProductId;

      if (productIdToUse) {
        // Update existing draft
        await updateProduct(productIdToUse, {
          name: nameToSave,
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          subcategory: formData.subcategory || undefined,
          material: formData.material.trim() || undefined,
          color: formData.color.trim() || undefined,
          craft_type: formData.craft_type.trim() || undefined,
          features: formData.features,
          price: priceNum,
          stock_quantity: stockNum,
        });
      } else {
        // Create new draft
        const newProduct = await createProduct({
          name: nameToSave,
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          subcategory: formData.subcategory || undefined,
          material: formData.material.trim() || undefined,
          color: formData.color.trim() || undefined,
          craft_type: formData.craft_type.trim() || undefined,
          features: formData.features,
          price: priceNum,
          stock_quantity: stockNum,
        });
        productIdToUse = newProduct.id;
        setActiveProductId(newProduct.id);
      }

      // Handle image uploads
      if (selectedFile && productIdToUse) {
        const uploadedOriginalUrl = await uploadProductImage(productIdToUse, selectedFile, 'original');
        setOriginalImageUrl(uploadedOriginalUrl);
        setCurrentImageUrl(uploadedOriginalUrl);
      }

      if (enhancedBlob && productIdToUse) {
        const uploadedEnhancedUrl = await uploadProductImage(productIdToUse, enhancedBlob, 'enhanced');
        setCurrentImageUrl(uploadedEnhancedUrl);
      }

      // Persist all generated/edited catalogue versions to DB
      if (productIdToUse && catalogueMap) {
        for (const lang of ['en', 'ta', 'hi'] as CatalogueLanguage[]) {
          const catContent = catalogueMap[lang];
          if (catContent) {
            try {
              await saveCatalogue(productIdToUse, lang, catContent, catalogueStyle, 'artisan');
            } catch (e) {
              // Ignore single language save error
            }
          }
        }
      }

      // Persist pricing state to DB
      if (productIdToUse && pricingState) {
        try {
          await savePricingState(productIdToUse, pricingState);
        } catch (e) {
          // Ignore pricing save error
        }
      }

      // Clear user-scoped local draft cache on explicit save
      if (productIdToUse) {
        localStorage.removeItem(`m63_draft_${user?.id || 'anon'}_${productIdToUse}`);
      }
      setSaveSuccessMessage('✓ Draft saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      setGeneralError(err.message || 'We couldn’t save your product draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleTriggerPublish = () => {
    if (!validateFormForDraft()) {
      setViewMode('FORM');
      return;
    }
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);
      setGeneralError(null);

      const priceNum = parseFloat(formData.price) || 0;
      const stockNum = parseInt(formData.stock_quantity, 10) || 0;
      const nameToSave = formData.name.trim() || 'Untitled Product';

      let productIdToUse = activeProductId;

      if (productIdToUse) {
        await updateProduct(productIdToUse, {
          name: nameToSave,
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          subcategory: formData.subcategory || undefined,
          material: formData.material.trim() || undefined,
          color: formData.color.trim() || undefined,
          craft_type: formData.craft_type.trim() || undefined,
          features: formData.features,
          price: priceNum,
          stock_quantity: stockNum,
        });
      } else {
        const newProduct = await createProduct({
          name: nameToSave,
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          subcategory: formData.subcategory || undefined,
          material: formData.material.trim() || undefined,
          color: formData.color.trim() || undefined,
          craft_type: formData.craft_type.trim() || undefined,
          features: formData.features,
          price: priceNum,
          stock_quantity: stockNum,
        });
        productIdToUse = newProduct.id;
        setActiveProductId(newProduct.id);
      }

      if (selectedFile && productIdToUse) {
        await uploadProductImage(productIdToUse, selectedFile, 'original');
      }

      if (enhancedBlob && productIdToUse) {
        await uploadProductImage(productIdToUse, enhancedBlob, 'enhanced');
      }

      // Persist all generated/edited catalogue versions to DB on publish
      if (productIdToUse && catalogueMap) {
        for (const lang of ['en', 'ta', 'hi'] as CatalogueLanguage[]) {
          const catContent = catalogueMap[lang];
          if (catContent) {
            try {
              await saveCatalogue(productIdToUse, lang, catContent, catalogueStyle, 'artisan');
            } catch (e) {
              // Ignore single language save error
            }
          }
        }
      }

      // Persist pricing state to DB on publish
      if (productIdToUse && pricingState) {
        try {
          await savePricingState(productIdToUse, pricingState);
        } catch (e) {
          // Ignore pricing save error
        }
      }

      if (productIdToUse) {
        await publishProduct(productIdToUse);
        localStorage.removeItem(`m63_draft_${user?.id || 'anon'}_${productIdToUse}`);
      }

      setShowPublishModal(false);
      navigate('/artisan/products');
    } catch (err: any) {
      setShowPublishModal(false);
      setGeneralError(err.message || 'Unable to publish product. Please review required fields and try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const imagePreviewUrl = currentImageUrl || (selectedFile ? URL.createObjectURL(selectedFile) : null);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Navigation & Language Selector Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: 'var(--m63-bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--m63-radius-lg)',
          border: '1px solid var(--m63-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/artisan/products')}
            style={{
              background: 'none',
              border: '1px solid var(--m63-border)',
              borderRadius: 'var(--m63-radius-md)',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--m63-slate)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Back to products"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
              Product Registration
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
              Speak in your regional language or type manually in one unified session.
            </p>
          </div>
        </div>

        {/* Question Language Selector & View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Question Language Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} style={{ color: 'var(--m63-primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--m63-slate-subtle)' }}>
              Question Language:
            </span>
            <select
              value={questionLanguage}
              onChange={(e) => setQuestionLanguage(e.target.value as SupportedQuestionLanguage)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--m63-radius-md)',
                border: '1px solid var(--m63-border)',
                backgroundColor: 'var(--m63-bg-canvas)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--m63-slate)',
                cursor: 'pointer',
              }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Form / Review Mode Toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant={viewMode === 'FORM' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('FORM')}
            >
              Form View
            </Button>
            <Button
              variant={viewMode === 'REVIEW' ? 'primary' : 'secondary'}
              size="sm"
              icon={<Eye size={16} />}
              onClick={() => setViewMode('REVIEW')}
            >
              Review Listing
            </Button>
          </div>
        </div>
      </div>

      {/* General Error Alert */}
      {generalError && (
        <div className="m63-alert m63-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{generalError}</span>
        </div>
      )}

      {/* Autosaved Indicator Notice */}
      {autosavedTime && (
        <div style={{ textAlign: 'right', maxWidth: '840px', margin: '-12px auto 0 auto', width: '100%' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--m63-slate-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} style={{ color: 'var(--m63-primary)' }} /> Draft saved locally at {autosavedTime}
          </span>
        </div>
      )}

      {/* Form or Review View */}
      {viewMode === 'REVIEW' ? (
        <ProductReview
          formData={formData}
          imagePreviewUrl={imagePreviewUrl}
          originalImageUrl={originalImageUrl}
          voiceTranscript={voiceTranscript}
          detectedLanguage={detectedLanguage}
          isAiAssisted={isAiAssisted}
          onEdit={() => setViewMode('FORM')}
          onSaveDraft={handleSaveDraft}
          onPublish={handleTriggerPublish}
          isSaving={isSavingDraft}
          isPublishing={isPublishing}
        />
      ) : (
        /* Unified Product Registration Form */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
          
          {/* Section 1: Product Basics */}
          <div className="m63-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-primary-light)', color: 'var(--m63-primary)' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.sections.basicsTitle}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)' }}>
                    {loc.sections.basicsSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Name Question & Voice Button */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  {loc.questions.productNameQuestion} *
                </label>
                <FieldVoiceRecorder
                  fieldName="name"
                  fieldLabel="Product Name"
                  onAudioCaptured={handleFieldAudioCaptured}
                  loc={loc}
                  activeField={activeVoiceField}
                  setActiveField={setActiveVoiceField}
                />
              </div>

              <Input
                placeholder={loc.questions.productNamePlaceholder}
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={fieldErrors.name}
                helperText={loc.questions.productNameHelper}
              />

              {aiSuggestedFields.name && (
                <span className="m63-badge m63-badge-ai" style={{ marginTop: '4px' }}>
                  <Sparkles size={11} /> {loc.actions.suggestedByM63}
                </span>
              )}

              {clarificationState.name && (
                <div className="m63-alert m63-alert-warning" style={{ marginTop: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={14} />
                  <span>{clarificationState.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Product Story & Description */}
          <div className="m63-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', color: 'var(--m63-slate)' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.sections.storyTitle}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)' }}>
                    {loc.sections.storySubtitle}
                  </p>
                </div>
              </div>

              <FieldVoiceRecorder
                fieldName="description"
                fieldLabel="Product Description"
                onAudioCaptured={handleFieldAudioCaptured}
                loc={loc}
                activeField={activeVoiceField}
                setActiveField={setActiveVoiceField}
              />
            </div>

            <Textarea
              label={loc.questions.descriptionQuestion}
              placeholder={loc.questions.descriptionPlaceholder}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={fieldErrors.description}
              helperText={loc.questions.descriptionHelper}
            />

            {aiSuggestedFields.description && (
              <span className="m63-badge m63-badge-ai" style={{ marginTop: '4px' }}>
                <Sparkles size={11} /> {loc.actions.suggestedByM63}
              </span>
            )}
          </div>

          {/* Section 3: Craft Details & Materials */}
          <div className="m63-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', color: 'var(--m63-slate)' }}>
                <Layers size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  {loc.sections.craftTitle}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)' }}>
                  {loc.sections.craftSubtitle}
                </p>
              </div>
            </div>

            {/* Category & Subcategory Dropdowns (Structured / Manual Only) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <Select
                label={loc.questions.categoryQuestion}
                options={CRAFT_CATEGORIES.map((c) => c.name)}
                value={formData.category}
                onChange={(e) => {
                  handleChange('category', e.target.value);
                  handleChange('subcategory', '');
                }}
                placeholder="Choose category"
              />

              <Select
                label={loc.questions.subcategoryQuestion}
                options={subcategoryOptions}
                value={formData.subcategory}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                placeholder="Choose subcategory"
                disabled={!formData.category}
              />
            </div>

            {/* Material & Craft Technique Fields (Voice Enabled) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Material */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.questions.materialQuestion}
                  </label>
                  <FieldVoiceRecorder
                    fieldName="material"
                    fieldLabel="Material"
                    onAudioCaptured={handleFieldAudioCaptured}
                    loc={loc}
                    activeField={activeVoiceField}
                    setActiveField={setActiveVoiceField}
                  />
                </div>
                <Input
                  placeholder={loc.questions.materialPlaceholder}
                  value={formData.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                />
                {aiSuggestedFields.material && (
                  <span className="m63-badge m63-badge-ai" style={{ marginTop: '4px' }}>
                    <Sparkles size={11} /> {loc.actions.suggestedByM63}
                  </span>
                )}
              </div>

              {/* Craft Technique */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.questions.craftTypeQuestion}
                  </label>
                  <FieldVoiceRecorder
                    fieldName="craft_type"
                    fieldLabel="Craft Technique"
                    onAudioCaptured={handleFieldAudioCaptured}
                    loc={loc}
                    activeField={activeVoiceField}
                    setActiveField={setActiveVoiceField}
                  />
                </div>
                <Input
                  placeholder={loc.questions.craftTypePlaceholder}
                  value={formData.craft_type}
                  onChange={(e) => handleChange('craft_type', e.target.value)}
                />
                {aiSuggestedFields.craft_type && (
                  <span className="m63-badge m63-badge-ai" style={{ marginTop: '4px' }}>
                    <Sparkles size={11} /> {loc.actions.suggestedByM63}
                  </span>
                )}
              </div>
            </div>

            {/* Features & Craft Highlights (Voice Enabled) */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  {loc.questions.featuresQuestion}
                </label>
                <FieldVoiceRecorder
                  fieldName="features"
                  fieldLabel="Product Features"
                  onAudioCaptured={handleFieldAudioCaptured}
                  loc={loc}
                  activeField={activeVoiceField}
                  setActiveField={setActiveVoiceField}
                />
              </div>

              <FeatureTagInput
                features={formData.features}
                onChange={(newFeatures) => handleChange('features', newFeatures)}
              />

              {aiSuggestedFields.features && (
                <span className="m63-badge m63-badge-ai" style={{ marginTop: '6px' }}>
                  <Sparkles size={11} /> {loc.actions.suggestedByM63}
                </span>
              )}
            </div>
          </div>

          {/* Section 4: Pricing & Stock (Voice Enabled with Strict Safety) */}
          <div className="m63-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-primary-light)', color: 'var(--m63-primary)' }}>
                <IndianRupee size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                  {loc.sections.pricingTitle}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)' }}>
                  {loc.sections.pricingSubtitle}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Selling Price */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.questions.priceQuestion} *
                  </label>
                  <FieldVoiceRecorder
                    fieldName="price"
                    fieldLabel="Selling Price"
                    onAudioCaptured={handleFieldAudioCaptured}
                    loc={loc}
                    activeField={activeVoiceField}
                    setActiveField={setActiveVoiceField}
                  />
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={loc.questions.pricePlaceholder}
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  error={fieldErrors.price}
                  helperText={loc.questions.priceHelper}
                />
                {clarificationState.price && (
                  <div className="m63-alert m63-alert-warning" style={{ marginTop: '6px', fontSize: '0.8rem' }}>
                    <HelpCircle size={14} /> <span>{clarificationState.price}</span>
                  </div>
                )}
              </div>

              {/* Available Stock */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                    {loc.questions.stockQuestion} *
                  </label>
                  <FieldVoiceRecorder
                    fieldName="stock"
                    fieldLabel="Stock Quantity"
                    onAudioCaptured={handleFieldAudioCaptured}
                    loc={loc}
                    activeField={activeVoiceField}
                    setActiveField={setActiveVoiceField}
                  />
                </div>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={loc.questions.stockPlaceholder}
                  value={formData.stock_quantity}
                  onChange={(e) => handleChange('stock_quantity', e.target.value)}
                  error={fieldErrors.stock_quantity}
                  helperText={loc.questions.stockHelper}
                />
              </div>
            </div>

            {/* ✨ Smart Fair Pricing Intelligence Section */}
            <div style={{ marginTop: '24px' }}>
              <SmartFairPricingSection
                productData={{
                  name: formData.name,
                  category: formData.category,
                  subcategory: formData.subcategory,
                  material: formData.material,
                  craft_type: formData.craft_type,
                  features: formData.features,
                  price: parseFloat(formData.price) || undefined,
                }}
                productId={activeProductId || undefined}
                initialPricing={pricingState}
                onPricingChange={(state) => setPricingState(state)}
                onApplyRecommendedPrice={(sugPrice) => handleChange('price', String(sugPrice))}
              />
            </div>
          </div>

          {/* Section 5: Product Photos (File Upload, Camera & Smart Studio Image Enhancement) */}
          <div className="m63-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--m63-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--m63-bg-canvas)', color: 'var(--m63-slate)' }}>
                  <Camera size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
                      {loc.sections.photosTitle}
                    </h2>
                    <span className="m63-badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '0.72rem', fontWeight: 700 }}>
                      <Sparkles size={11} /> Smart Studio Enhanced
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
                    {loc.sections.photosSubtitle}
                  </p>
                </div>
              </div>

              {/* Direct Camera Button */}
              <Button
                variant="secondary"
                size="sm"
                icon={<Camera size={16} />}
                onClick={() => setIsCameraOpen(true)}
              >
                {loc.actions.takePhoto}
              </Button>
            </div>

            <ImageUpload
              currentImageUrl={imagePreviewUrl}
              selectedFile={selectedFile}
              onFileSelect={handlePhotoSelected}
              onOpenCamera={() => setIsCameraOpen(true)}
              onImprovePhoto={handleOpenStudioSettings}
              isImprovingPhoto={isImprovingPhoto}
              qualityRating={qualityRating}
              validationFeedback={validationFeedback}
              isValidProductImage={isValidProductImage}
            />

            {/* Photo Notice Message (e.g. AI enhancement unavailable / original safe) */}
            {photoNoticeMessage && (
              <div className="mt-3 p-3 rounded-lg text-xs bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{photoNoticeMessage}</span>
              </div>
            )}
          </div>

          {/* ✨ M63 SMART CATALOGUE SECTION */}
          <SmartCatalogueSection
            productData={{
              name: formData.name,
              description: formData.description,
              category: formData.category,
              subcategory: formData.subcategory,
              material: formData.material,
              color: formData.color,
              craft_type: formData.craft_type,
              features: formData.features,
              price: parseFloat(formData.price) || undefined,
              stock_quantity: parseInt(formData.stock_quantity, 10) || undefined,
              production_time: formData.production_time,
            }}
            productId={activeProductId || undefined}
            imageUrl={currentImageUrl || imagePreviewUrl}
            initialCatalogues={catalogueMap}
            initialStyle={catalogueStyle}
            isLoadingCatalogue={isLoadingCatalogue}
            onCatalogueChange={(cats, style) => {
              setCatalogueMap(cats);
              if (style) setCatalogueStyle(style);
            }}
          />

          {/* Persistent Draft Save Success Alert */}
          {saveSuccessMessage && (
            <div className="m63-alert m63-alert-success flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span className="font-semibold">{saveSuccessMessage}</span>
              </div>
              <span className="text-xs opacity-80">Saved to M63 Database</span>
            </div>
          )}

          {/* Form Action Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingTop: '12px' }}>
            <Button
              variant="secondary"
              icon={<Eye size={18} />}
              onClick={() => {
                if (validateFormForDraft()) setViewMode('REVIEW');
              }}
            >
              {loc.actions.reviewProduct}
            </Button>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                icon={<Save size={18} />}
                onClick={handleSaveDraft}
                loading={isSavingDraft}
                disabled={isPublishing}
              >
                {loc.actions.saveDraft}
              </Button>

              <Button
                variant="primary"
                icon={<Rocket size={18} />}
                onClick={handleTriggerPublish}
                loading={isPublishing}
                disabled={isSavingDraft}
              >
                {loc.actions.publishProduct}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Studio Background & Settings Selection Modal */}
      <SmartStudioSettingsModal
        isOpen={showStudioSettingsModal}
        onClose={() => setShowStudioSettingsModal(false)}
        onApply={(bgOption, colorHex) => handleImprovePhoto(bgOption, colorHex)}
        isProcessing={isImprovingPhoto}
      />

      {/* Before / After Photo Enhancement Comparison Modal */}
      {showEnhanceModal && enhancedImageBase64 && imagePreviewUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowEnhanceModal(false)}
        >
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--m63-bg-surface)',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
              border: '1px solid var(--m63-border)',
              width: '100%',
              maxWidth: '640px',
              padding: '20px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowEnhanceModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--m63-slate-subtle)',
                padding: '4px',
                borderRadius: '6px',
                zIndex: 10,
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
            <ImageEnhanceComparison
              originalUrl={imagePreviewUrl}
              enhancedUrl={enhancedImageBase64}
              activeVariant={currentImageUrl === enhancedImageBase64 ? 'enhanced' : 'original'}
              onSelectOriginal={handleSelectOriginal}
              onSelectEnhanced={handleSelectEnhanced}
              onTryAgain={handleOpenStudioSettings}
              isLoading={isImprovingPhoto}
              improvementsApplied={improvementsApplied}
            />
          </div>
        </div>
      )}

      {/* Direct Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handlePhotoSelected}
        loc={loc}
      />

      {/* Confirmation Modal for Publish Action */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Ready to publish this product?"
        description="Once published, this handcrafted product will become active and visible in the M63 marketplace."
        confirmLabel="Publish Now"
        cancelLabel="Keep as Draft"
        onConfirm={handleConfirmPublish}
        loading={isPublishing}
      >
        <div style={{ backgroundColor: 'var(--m63-bg-canvas)', padding: '12px 16px', borderRadius: 'var(--m63-radius-md)', border: '1px solid var(--m63-border)' }}>
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--m63-slate)' }}>
            {formData.name || 'Untitled Product'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
            Price: ₹{formData.price || '0'} • Available stock: {formData.stock_quantity || '0'} units
          </p>
        </div>
      </Modal>
    </div>
  );
};
