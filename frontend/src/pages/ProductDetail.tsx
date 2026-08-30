import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types/product.js';
import { CRAFT_CATEGORIES } from '../data/categories.js';
import {
  getProduct,
  updateProduct,
  publishProduct,
  archiveProduct,
  uploadProductImage,
} from '../services/productService.js';
import { ProductStatusBadge } from '../components/product/ProductStatusBadge.js';
import { Input } from '../components/ui/Input.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { ImageUpload } from '../components/product/ImageUpload.js';
import { FeatureTagInput } from '../components/product/FeatureTagInput.js';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.js';
import { SmartCatalogueSection } from '../components/product/SmartCatalogueSection.js';
import { SmartFairPricingSection } from '../components/pricing/SmartFairPricingSection.js';
import { savePricingState, getPricingState } from '../services/pricingService.js';
import {
  getCatalogue,
  saveCatalogue,
  CatalogueLanguage,
  CatalogueStyle,
  GeneratedCatalogueContent,
} from '../services/catalogueService.js';
import {
  ArrowLeft,
  Save,
  Rocket,
  Archive,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const ProductDetail: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields State
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
    stock_quantity: '0',
  });

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Modal States
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductDetails(productId);
    }
  }, [productId]);

  const fetchProductDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProduct(id);
      setProduct(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        subcategory: data.subcategory || '',
        material: data.material || '',
        color: data.color || '',
        craft_type: data.craftType || '',
        features: data.features || [],
        price: data.price.toString(),
        stock_quantity: data.stockQuantity.toString(),
      });

      // Retrieve saved catalogue from DB
      try {
        setIsLoadingCatalogue(true);
        const catRes = await getCatalogue(id);
        if (catRes && catRes.catalogues) {
          setCatalogueMap(catRes.catalogues);
          if (catRes.style) setCatalogueStyle(catRes.style);
        }
      } catch (e) {
        // Ignore if catalogue not found
      }

      // Retrieve saved pricing state from DB
      try {
        const pricingRes = await getPricingState(id);
        if (pricingRes && pricingRes.pricing) {
          setPricingState(pricingRes.pricing);
        }
      } catch (e) {
        // Ignore if pricing state not found
      } finally {
        setIsLoadingCatalogue(false);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve product details.');
    } finally {
      setLoading(false);
    }
  };

  const subcategoryOptions = useMemo(() => {
    if (!formData.category) return [];
    const found = CRAFT_CATEGORIES.find((c) => c.name === formData.category);
    return found ? found.subcategories : [];
  }, [formData.category]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMsg(null);
  };

  const handleSaveChanges = async () => {
    if (!productId || !product) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      const priceNum = parseFloat(formData.price) || 0;
      const stockNum = parseInt(formData.stock_quantity, 10) || 0;

      // 1. Upload image if replaced
      if (selectedFile) {
        await uploadProductImage(productId, selectedFile);
        setSelectedFile(null);
      }

      // 2. Update metadata
      const updated = await updateProduct(productId, {
        name: formData.name.trim(),
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

      // 3. Persist all generated/edited catalogue versions to DB
      if (productId && catalogueMap) {
        for (const lang of ['en', 'ta', 'hi'] as CatalogueLanguage[]) {
          const catContent = catalogueMap[lang];
          if (catContent) {
            try {
              await saveCatalogue(productId, lang, catContent, catalogueStyle, 'artisan');
            } catch (e) {
              // Ignore single language save notice
            }
          }
        }
      }

      // 4. Persist pricing state to DB
      if (productId && pricingState) {
        try {
          await savePricingState(productId, pricingState);
        } catch (e) {
          // Ignore pricing save notice
        }
      }

      setProduct(updated);
      setSuccessMsg('Product details, Smart Catalogue, and Pricing Intelligence saved successfully.');
    } catch (err: any) {
      setError(err.message || 'We couldn’t save changes to your product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!productId) return;

    try {
      setIsPublishing(true);
      setError(null);

      // Save changes first if file or inputs modified
      await handleSaveChanges();

      const published = await publishProduct(productId);
      setProduct(published);
      setShowPublishModal(false);
      setSuccessMsg('Product published successfully! It is now active in your catalogue.');
    } catch (err: any) {
      setShowPublishModal(false);
      setError(err.message || 'Unable to publish product. Please check required fields.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchive = async () => {
    if (!productId) return;

    try {
      setIsArchiving(true);
      setError(null);

      const archived = await archiveProduct(productId);
      setProduct(archived);
      setShowArchiveModal(false);
      setSuccessMsg('Product archived. It will no longer appear in your active marketplace.');
    } catch (err: any) {
      setShowArchiveModal(false);
      setError(err.message || 'Failed to archive product.');
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '12px' }}>
        <LoadingSpinner size={32} color="var(--m63-primary)" />
        <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)' }}>Loading product details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="m63-card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={40} style={{ color: 'var(--m63-error)', marginBottom: '12px' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--m63-slate)' }}>Product Not Found</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--m63-slate-subtle)', marginTop: '4px', marginBottom: '20px' }}>{error}</p>
        <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/artisan/products')}>
          Back to My Products
        </Button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--m63-slate)', letterSpacing: '-0.02em' }}>
                {product.name}
              </h1>
              <ProductStatusBadge status={product.status} />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--m63-slate-subtle)', marginTop: '2px' }}>
              Created {new Date(product.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {product.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Rocket size={16} />}
              onClick={() => setShowPublishModal(true)}
              disabled={isSaving}
            >
              Publish Product
            </Button>
          )}

          {product.status !== 'ARCHIVED' && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Archive size={16} />}
              style={{ color: 'var(--m63-error)' }}
              onClick={() => setShowArchiveModal(true)}
              disabled={isSaving}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="m63-alert m63-alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="m63-alert m63-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Edit Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Image Card */}
        <div className="m63-card">
          <ImageUpload
            currentImageUrl={product.primaryImageUrl}
            selectedFile={selectedFile}
            onFileSelect={(file) => setSelectedFile(file)}
          />
        </div>

        {/* Basics Card */}
        <div className="m63-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '16px' }}>
            Product Basics
          </h2>

          <Input
            label="Product name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />

          <Textarea
            label="Tell customers about your product"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        {/* Details Card */}
        <div className="m63-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '16px' }}>
            Craft Specifications
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Select
              label="Craft Category"
              options={CRAFT_CATEGORIES.map((c) => c.name)}
              value={formData.category}
              onChange={(e) => {
                handleChange('category', e.target.value);
                handleChange('subcategory', '');
              }}
            />

            <Select
              label="Subcategory"
              options={subcategoryOptions}
              value={formData.subcategory}
              onChange={(e) => handleChange('subcategory', e.target.value)}
              disabled={!formData.category}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <Input
              label="Primary Material"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
            />

            <Input
              label="Primary Color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
            />

            <Input
              label="Craft Technique"
              value={formData.craft_type}
              onChange={(e) => handleChange('craft_type', e.target.value)}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <FeatureTagInput
              features={formData.features}
              onChange={(newFeatures) => handleChange('features', newFeatures)}
            />
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="m63-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m63-slate)', marginBottom: '16px' }}>
            Pricing & Inventory
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Input
              label="Price (₹)"
              type="number"
              min="0"
              step="1"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
            />

            <Input
              label="Available Stock Quantity"
              type="number"
              min="0"
              step="1"
              value={formData.stock_quantity}
              onChange={(e) => handleChange('stock_quantity', e.target.value)}
            />
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
              productId={productId}
              initialPricing={pricingState}
              onPricingChange={(state) => setPricingState(state)}
              onApplyRecommendedPrice={(sugPrice) => handleChange('price', String(sugPrice))}
            />
          </div>
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
          }}
          productId={productId}
          imageUrl={product.primaryImageUrl}
          initialCatalogues={catalogueMap}
          initialStyle={catalogueStyle}
          isLoadingCatalogue={isLoadingCatalogue}
          onCatalogueChange={(cats, style) => {
            setCatalogueMap(cats);
            if (style) setCatalogueStyle(style);
          }}
        />

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/artisan/products')}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveChanges} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Ready to publish this product?"
        description="This handcrafted item will become active in your public catalogue."
        confirmLabel="Publish Product"
        onConfirm={handlePublish}
        loading={isPublishing}
      />

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive this product?"
        description="This product will no longer appear in your active marketplace. You can still view it in your archived items."
        confirmLabel="Archive Product"
        cancelLabel="Keep Product"
        onConfirm={handleArchive}
        variant="danger"
        loading={isArchiving}
      />
    </div>
  );
};
