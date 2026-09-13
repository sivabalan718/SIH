import { apiRequest, setStoredTokens, setStoredToken, getStoredToken } from './api.js';
export { setStoredToken, setStoredTokens, getStoredToken };
import {
  RegisterPayload,
  CustomerRegisterPayload,
  LoginPayload,
  CustomerLoginPayload,
  ArtisanUser,
  CustomerProfile,
} from '../types/auth.js';

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

export async function registerCustomerUser(payload: CustomerRegisterPayload) {
  const data = await apiRequest<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
    customer: CustomerProfile;
    user: ArtisanUser;
  }>('/auth/customer/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data.accessToken) {
    setStoredTokens(data.accessToken, data.refreshToken);
  }
  return data.user || (data.customer as any);
}

export async function loginCustomerUser(payload: CustomerLoginPayload) {
  const data = await apiRequest<{
    accessToken: string;
    refreshToken: string;
    customer: CustomerProfile;
    user: ArtisanUser;
  }>('/auth/customer/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setStoredTokens(data.accessToken, data.refreshToken);
  return data.user || (data.customer as any);
}

export async function getCustomerProfileData() {
  const data = await apiRequest<{ customer: CustomerProfile }>('/auth/customer/profile');
  return data.customer;
}

export async function updateCustomerProfileData(payload: Partial<CustomerProfile>) {
  const data = await apiRequest<{ customer: CustomerProfile }>('/auth/customer/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.customer;
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
  const data = await apiRequest<{ artisan?: ArtisanUser; customer?: CustomerProfile; user?: ArtisanUser }>('/auth/me');
  if (data.user) return data.user;
  if (data.artisan) return { ...data.artisan, role: 'ARTISAN' as const };
  if (data.customer) return { ...data.customer, role: 'CUSTOMER' as const };
  return null;
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
