import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvConfig {
  port: number;
  nodeEnv: string;
  clientOrigin: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  // M63 AI Configuration
  geminiApiKey: string;
  geminiTranscriptionModel: string;
  geminiLlmModel: string;
  geminiImageModel: string;
  googleCloudProjectId: string;
  googleApplicationCredentials: string;
  aiMockMode: boolean;
  // Cloudinary Configuration
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
}

export function loadEnv(): EnvConfig {
  const port = parseInt(process.env.PORT || '5000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const geminiTranscriptionModel = process.env.GEMINI_TRANSCRIPTION_MODEL || 'gemini-3.5-transcribe';
  const geminiLlmModel = process.env.GEMINI_LLM_MODEL || 'gemini-3.6-flash';
  const geminiImageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const googleCloudProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  const aiMockMode = process.env.M63_AI_MOCK_MODE === 'true';

  const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
  const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(`[Configuration Warning] Missing environment variables: ${missing.join(', ')}.`);
  }

  return {
    port,
    nodeEnv,
    clientOrigin,
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseAnonKey,
    geminiApiKey,
    geminiTranscriptionModel,
    geminiLlmModel,
    geminiImageModel,
    googleCloudProjectId,
    googleApplicationCredentials,
    aiMockMode,
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
  };
}

export const env = loadEnv();
