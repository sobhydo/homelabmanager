import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Subscription,
  SubscriptionCreate,
  SubscriptionUpdate,
} from "../types/software";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["subscriptions"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useSubscriptions(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Subscription>>(
        "/subscriptions",
        { params }
      );
      return data;
    },
  });
}

export function useSubscription(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Subscription>(
        `/subscriptions/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubscriptionCreate) => {
      const { data } = await apiClient.post<Subscription>(
        "/subscriptions",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateSubscription(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubscriptionUpdate) => {
      const { data } = await apiClient.put<Subscription>(
        `/subscriptions/${id}`,
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

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/subscriptions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
