import { TargetProductInput, PricingResult, PricingLanguage } from './types.js';
import { calculateCostAnalysis } from './costEngine.js';
import { fetchAndEvaluateComparables } from './comparableSelection.js';
import { reconcileCostAndMarket } from './reconciliation.js';
import { evaluateConfidence } from './confidence.js';
import { buildTrustAndProvenance } from './trust.js';
import { buildEvidencePacket } from './evidencePacket.js';
import { generatePricingExplanation } from './geminiExplanation.js';
import { validateProductFacts } from '../ai/pricing-intelligence.service.js';

export async function executePricingEngine(
  input: TargetProductInput,
  language: PricingLanguage = 'en'
): Promise<PricingResult> {
  // 1. Product Fact Validation
  const factValidation = validateProductFacts({
    name: input.name,
    category: input.category,
    subcategory: input.subcategory,
    material: input.material,
    craft_type: input.craftType,
    features: input.features,
    existing_price: input.existingPrice || undefined,
    material_cost: input.materialCost,
    labour_cost: input.labourCost,
    other_expenses: input.otherExpenses,
    production_time: input.productionTime,
    production_time_unit: input.productionTimeUnit || undefined,
  });

  // 2. Verified Known Cost, Cost Floor, Cost Anchor Engine
  const costAnalysis = calculateCostAnalysis(input);

  // 3. Candidate Retrieval, Mandatory Self-Exclusion by Canonical Product ID, Functional Gate, Similarity, Tiering, Influence & Weighted Statistics
  const marketReference = await fetchAndEvaluateComparables(input);

  // 4. Evidence-Quality Cost + Market Reconciliation
  const reconciliation = reconcileCostAndMarket(costAnalysis, marketReference);

  // 5. Multi-factor Deterministic Confidence Engine
  const confidence = evaluateConfidence(costAnalysis, marketReference, factValidation.high_impact_conflict);

  // 6. Data Trust Matrix & Evidence Provenance
  const { trustMatrix, provenance } = buildTrustAndProvenance(input, costAnalysis, marketReference);

  // 7. Structured Evidence Packet Builder
  const evidencePacket = buildEvidencePacket(
    input,
    costAnalysis,
    marketReference,
    reconciliation,
    confidence,
    trustMatrix,
    provenance,
    factValidation.has_conflicts
  );

  // 8. Read-only Gemini Explanation & Numeric Validation Layer
  const { explanation, explanationGeneratedBy } = await generatePricingExplanation(evidencePacket, language);

  return {
    ...evidencePacket,
    explanation,
    explanationGeneratedBy,
  };
}
