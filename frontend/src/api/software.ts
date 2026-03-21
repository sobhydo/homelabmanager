import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Software,
  SoftwareCreate,
  SoftwareUpdate,
} from "../types/software";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["software"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useSoftwareList(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Software>>(
        "/software",
        { params }
      );
      return data;
    },
  });
}

export function useSoftware(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Software>(`/software/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SoftwareCreate) => {
      const { data } = await apiClient.post<Software>("/software", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateSoftware(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SoftwareUpdate) => {
      const { data } = await apiClient.put<Software>(
        `/software/${id}`,
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

export function useDeleteSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/software/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
