import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Tool, ToolCreate, ToolUpdate } from "../types/tool";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["tools"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useTools(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Tool>>("/tools", {
        params,
      });
      return data;
    },
  });
}

export function useTool(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Tool>(`/tools/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ToolCreate) => {
      const { data } = await apiClient.post<Tool>("/tools", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateTool(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ToolUpdate) => {
      const { data } = await apiClient.put<Tool>(`/tools/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/tools/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useCheckoutTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      checked_out_to,
    }: {
      id: number;
      checked_out_to: string;
    }) => {
      const { data } = await apiClient.post<Tool>(`/tools/${id}/checkout`, {
        checked_out_to,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useReturnTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<Tool>(`/tools/${id}/return`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
