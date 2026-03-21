import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Bom, BomCreate, BomAvailability } from "../types/bom";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["boms"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
  availability: (id: number) => [...KEYS.all, "availability", id] as const,
};

export function useBoms(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Bom>>("/boms", {
        params,
      });
      return data;
    },
  });
}

export function useBom(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Bom>(`/boms/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useBomAvailability(id: number) {
  return useQuery({
    queryKey: KEYS.availability(id),
    queryFn: async () => {
      const { data } = await apiClient.get<BomAvailability>(
        `/boms/${id}/availability`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useUploadBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      meta,
    }: {
      file: File;
      meta: BomCreate;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", meta.name);
      if (meta.description) formData.append("description", meta.description);
      const { data } = await apiClient.post<Bom>("/boms/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useBuildBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/boms/${id}/build`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useDeleteBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/boms/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
