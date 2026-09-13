export type UserRole = 'ARTISAN' | 'CUSTOMER' | 'ADMIN';
export type PreferredLanguage = 'en' | 'ta' | 'hi';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  role: 'CUSTOMER';
  address?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  preferredLanguage?: PreferredLanguage;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArtisanUser {
  id: string;
  name: string;
  email: string;
  m63Id?: string;
  role: UserRole;
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  mobile?: string | null;
  address?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  preferredLanguage?: PreferredLanguage;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CustomerRegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile?: string;
  address?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  preferredLanguage?: PreferredLanguage;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface CustomerLoginPayload {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: ArtisanUser | null;
  token: string | null;
  loading: boolean;
  register: (payload: RegisterPayload) => Promise<{ m63Id: string; artisan: ArtisanUser }>;
  login: (payload: LoginPayload) => Promise<ArtisanUser>;
  registerCustomer: (payload: CustomerRegisterPayload) => Promise<ArtisanUser>;
  loginCustomer: (payload: CustomerLoginPayload) => Promise<ArtisanUser>;
  updateCustomerProfile: (payload: Partial<CustomerProfile>) => Promise<ArtisanUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
