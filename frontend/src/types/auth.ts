export interface ArtisanUser {
  id: string;
  name: string;
  email: string;
  m63Id: string;
  role: 'ARTISAN' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthContextType {
  user: ArtisanUser | null;
  token: string | null;
  loading: boolean;
  register: (payload: RegisterPayload) => Promise<{ m63Id: string; artisan: ArtisanUser }>;
  login: (payload: LoginPayload) => Promise<ArtisanUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
