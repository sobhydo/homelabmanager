import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Invoice } from "../types/bom";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["invoices"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useInvoices(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Invoice>>(
        "/invoices",
        { params }
      );
      return data;
    },
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUploadInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<Invoice>(
        "/invoices/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useProcessInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<Invoice>(
        `/invoices/${id}/process`
      );
      return data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
