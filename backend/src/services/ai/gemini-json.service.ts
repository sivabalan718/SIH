import { z } from 'zod';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { isGeminiCoolingDown } from './catalogue-generation.service.js';

let cooldownUntil = 0;

/**
 * Ask Gemini for JSON and validate it against a schema. Returns null (never throws) when Gemini
 * is not configured, over quota, slow, or returns anything that does not match the schema —
 * callers then fall back to deterministic logic.
 */
export async function generateValidatedJson<T>(prompt: string, schema: z.ZodType<T>, timeoutMs = 8000): Promise<T | null> {
  if (!env.geminiApiKey || env.aiMockMode || Date.now() < cooldownUntil || isGeminiCoolingDown()) return null;
  const models = [env.geminiLlmModel, 'gemini-3.6-flash', 'gemini-3.5-flash-lite'].filter(Boolean);
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      });
      if (res.status === 429) {
        cooldownUntil = Date.now() + 15 * 60 * 1000;
        return null;
      }
      if (!res.ok) continue;
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = schema.safeParse(JSON.parse(String(text).replace(/```json\n?|\n?```/g, '').trim()));
      if (parsed.success) return parsed.data;
    } catch (e: any) {
      logger.warn(`[GeminiJSON] ${model} failed: ${e?.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
