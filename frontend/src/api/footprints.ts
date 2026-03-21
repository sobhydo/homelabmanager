import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Footprint,
  FootprintCreate,
  FootprintUpdate,
} from "../types/footprint";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["footprints"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
};

async function getFootprints(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Footprint>>(
    "/footprints",
    { params }
  );
  return data;
}

async function getFootprint(id: number) {
  const { data } = await apiClient.get<Footprint>(`/footprints/${id}`);
  return data;
}

async function createFootprint(payload: FootprintCreate) {
  const { data } = await apiClient.post<Footprint>("/footprints", payload);
  return data;
}

async function updateFootprint(id: number, payload: FootprintUpdate) {
  const { data } = await apiClient.put<Footprint>(
    `/footprints/${id}`,
    payload
  );
  return data;
}

async function deleteFootprint(id: number) {
  await apiClient.delete(`/footprints/${id}`);
}

export function useFootprints(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getFootprints(params),
  });
}

export function useFootprint(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getFootprint(id),
    enabled: !!id,
  });
}

export function useCreateFootprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFootprint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateFootprint(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FootprintUpdate) => updateFootprint(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteFootprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFootprint,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}
