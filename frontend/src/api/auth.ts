import apiClient from "./client";
import type { User, LoginResponse } from "../types/user";

export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);
  const { data } = await apiClient.post<LoginResponse>("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function registerApi(payload: {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/register", payload);
  return data;
}

export async function getMe(token: string): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

export async function refreshTokenApi(
  refresh_token: string
): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>("/auth/refresh", {
    refresh_token,
  });
  return data;
}

export async function updateProfile(payload: {
  full_name?: string;
  email?: string;
}): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/me", payload);
  return data;
}

export async function changePassword(
  current_password: string,
  new_password: string
): Promise<void> {
  await apiClient.put("/auth/me/password", {
    current_password,
    new_password,
  });
}
