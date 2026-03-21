export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "user" | "viewer";
  is_active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  role?: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  value_type: string;
  category: string | null;
  description: string | null;
  updated_at: string | null;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}
