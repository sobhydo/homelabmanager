import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { User, UserCreate, UserUpdate } from "../types/user";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["users"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
};

async function getUsers(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/users", {
    params,
  });
  return data;
}

async function getUser(id: number) {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
}

async function createUser(payload: UserCreate) {
  const { data } = await apiClient.post<User>("/users", payload);
  return data;
}

async function updateUser(id: number, payload: UserUpdate) {
  const { data } = await apiClient.put<User>(`/users/${id}`, payload);
  return data;
}

async function deleteUser(id: number) {
  await apiClient.delete(`/users/${id}`);
}

async function resetPassword(id: number) {
  const { data } = await apiClient.post<{ detail: string; temporary_password: string }>(
    `/users/${id}/reset-password`
  );
  return data;
}

export function useUsers(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getUsers(params),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateUser(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserUpdate) => updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useResetPassword(id: number) {
  return useMutation({
    mutationFn: () => resetPassword(id),
  });
}
