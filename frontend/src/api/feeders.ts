import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Feeder,
  FeederCreate,
  FeederUpdate,
  FeederListResponse,
} from "../types/feeder";

const KEYS = {
  all: ["feeders"] as const,
  list: (machineId?: number) => [...KEYS.all, "list", machineId] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
};

export function useFeeders(machineId?: number) {
  return useQuery({
    queryKey: KEYS.list(machineId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (machineId) params.machine_id = machineId;
      const { data } = await apiClient.get<FeederListResponse>("/feeders", {
        params,
      });
      return data;
    },
  });
}

export function useCreateFeeder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FeederCreate) => {
      const { data } = await apiClient.post<Feeder>("/feeders", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateFeeder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: FeederUpdate;
    }) => {
      const { data } = await apiClient.put<Feeder>(`/feeders/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteFeeder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/feeders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
