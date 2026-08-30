import { apiRequest, setStoredTokens, setStoredToken, getStoredToken } from './api.js';
export { setStoredToken, setStoredTokens, getStoredToken };
import { RegisterPayload, LoginPayload, ArtisanUser } from '../types/auth.js';

export async function registerUser(payload: RegisterPayload) {
  const data = await apiRequest<{
    message: string;
    m63Id: string;
    accessToken?: string;
    refreshToken?: string;
    artisan: ArtisanUser;
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data.accessToken) {
    setStoredTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function loginUser(payload: LoginPayload) {
  const data = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    artisan: ArtisanUser;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setStoredTokens(data.accessToken, data.refreshToken);
  return data.artisan;
}

export async function logoutUser() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore backend logout errors if token already invalidated
  } finally {
    setStoredTokens(null, null);
  }
}

export async function getCurrentUser() {
  const data = await apiRequest<{ artisan: ArtisanUser }>('/auth/me');
  return data.artisan;
}

export async function getArtisanProfile() {
  const data = await apiRequest<{ artisan: ArtisanUser }>('/artisan/profile');
  return data.artisan;
}

export async function updateArtisanProfileName(name: string) {
  const data = await apiRequest<{ artisan: ArtisanUser }>('/artisan/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  return data.artisan;
}
