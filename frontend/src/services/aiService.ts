import { VoiceToProductResponse } from '../types/ai.js';

export async function processVoiceToProduct(
  audioBlob: Blob,
  targetField?: string,
  questionLanguage?: string,
  browserTranscript?: string
): Promise<VoiceToProductResponse> {
  const token = localStorage.getItem('m63_access_token');
  const formData = new FormData();

  let ext = 'webm';
  if (audioBlob.type.includes('wav')) ext = 'wav';
  else if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) ext = 'mp3';
  else if (audioBlob.type.includes('m4a')) ext = 'm4a';

  formData.append('audio', audioBlob, `recording.${ext}`);
  if (targetField) {
    formData.append('targetField', targetField);
  }
  if (questionLanguage) {
    formData.append('questionLanguage', questionLanguage);
  }
  if (browserTranscript) {
    formData.append('browserTranscript', browserTranscript);
  }

  const response = await fetch('/api/v1/ai/voice-to-product', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Unable to process voice recording.' },
  }));

  if (!response.ok || !json.success) {
    const err: any = new Error(json.error?.message || 'We couldn’t process the voice recording. Please try again.');
    err.code = json.error?.code || 'VOICE_PROCESSING_FAILED';
    throw err;
  }

  return json.data as VoiceToProductResponse;
}

export interface ImageValidationResponse {
  isValidProductImage: boolean;
  qualityRating: 'GOOD' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT';
  feedbackMessage: string;
  isAiValidated: boolean;
}

export async function validateProductImage(imageFile: File | Blob): Promise<ImageValidationResponse> {
  const token = localStorage.getItem('m63_access_token');
  const formData = new FormData();
  formData.append('image', imageFile, 'photo.jpg');

  const response = await fetch('/api/v1/ai/validate-image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await response.json().catch(() => ({
    success: false,
    data: { validation: { isValidProductImage: true, qualityRating: 'GOOD', feedbackMessage: 'Photo ready for catalogue.' } },
  }));

  if (!response.ok || !json.success) {
    return {
      isValidProductImage: true,
      qualityRating: 'GOOD',
      feedbackMessage: 'Photo ready for product catalogue.',
      isAiValidated: false,
    };
  }

  return json.data.validation as ImageValidationResponse;
}

export interface ImageEnhancementResponse {
  enhancedAvailable: boolean;
  enhancedImageBase64?: string;
  enhancedImageUrl?: string;
  originalImageUrl?: string;
  improvementsApplied?: string[];
  mimeType?: string;
  isAiEnhanced?: boolean;
  code?: string;
  message?: string;
  originalImagePreserved: boolean;
}

export async function enhanceProductImage(
  imageFile: File | Blob,
  backgroundOption: string = 'WHITE',
  colorHex?: string
): Promise<ImageEnhancementResponse> {
  const token = localStorage.getItem('m63_access_token');
  const formData = new FormData();
  formData.append('image', imageFile, 'photo.jpg');
  formData.append('backgroundOption', backgroundOption);
  if (colorHex) {
    formData.append('colorHex', colorHex);
  }

  const response = await fetch('/api/v1/ai/enhance-image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = await response.json().catch(() => ({
    success: false,
    data: {
      enhancedAvailable: false,
      message: 'AI photo enhancement is currently unavailable. Your original photo is safe.',
      originalImagePreserved: true,
    },
  }));

  if (!response.ok || !json.success) {
    return {
      enhancedAvailable: false,
      message: json.error?.message || json.data?.message || 'AI photo enhancement is currently unavailable. Your original photo is safe.',
      code: json.error?.code || json.data?.code || 'AI_IMAGE_ENHANCEMENT_UNAVAILABLE',
      originalImagePreserved: true,
    };
  }

  return json.data as ImageEnhancementResponse;
}
