import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Material, MaterialCreate, MaterialUpdate } from "../types/tool";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["materials"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useMaterials(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Material>>(
        "/materials",
        { params }
      );
      return data;
    },
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Material>(`/materials/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaterialCreate) => {
      const { data } = await apiClient.post<Material>("/materials", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateMaterial(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaterialUpdate) => {
      const { data } = await apiClient.put<Material>(
        `/materials/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
