import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  BuildOrder,
  BuildOrderCreate,
  BuildOrderUpdate,
  BuildAllocation,
  BuildOutput,
} from "../types/build";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["build-orders"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams & { status?: string }) =>
    [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
  allocations: (id: number) => [...KEYS.all, "allocations", id] as const,
  outputs: (id: number) => [...KEYS.all, "outputs", id] as const,
};

async function getBuildOrders(
  params: PaginationParams & { status?: string } = {}
) {
  const { data } = await apiClient.get<PaginatedResponse<BuildOrder>>(
    "/build-orders",
    { params }
  );
  return data;
}

async function getBuildOrder(id: number) {
  const { data } = await apiClient.get<BuildOrder>(`/build-orders/${id}`);
  return data;
}

async function createBuildOrder(payload: BuildOrderCreate) {
  const { data } = await apiClient.post<BuildOrder>(
    "/build-orders",
    payload
  );
  return data;
}

async function updateBuildOrder(id: number, payload: BuildOrderUpdate) {
  const { data } = await apiClient.put<BuildOrder>(
    `/build-orders/${id}`,
    payload
  );
  return data;
}

async function deleteBuildOrder(id: number) {
  await apiClient.delete(`/build-orders/${id}`);
}

async function allocateBuildOrder(id: number) {
  const { data } = await apiClient.post<BuildOrder>(
    `/build-orders/${id}/allocate`
  );
  return data;
}

async function completeBuildOrder(id: number) {
  const { data } = await apiClient.post<BuildOrder>(
    `/build-orders/${id}/complete`
  );
  return data;
}

async function cancelBuildOrder(id: number) {
  const { data } = await apiClient.post<BuildOrder>(
    `/build-orders/${id}/cancel`
  );
  return data;
}

async function getBuildAllocations(id: number) {
  const { data } = await apiClient.get<BuildAllocation[]>(
    `/build-orders/${id}/allocations`
  );
  return data;
}

async function getBuildOutputs(id: number) {
  const { data } = await apiClient.get<BuildOutput[]>(
    `/build-orders/${id}/outputs`
  );
  return data;
}

// --- Hooks ---

export function useBuildOrders(
  params: PaginationParams & { status?: string } = {}
) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getBuildOrders(params),
  });
}

export function useBuildOrder(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getBuildOrder(id),
    enabled: !!id,
  });
}

export function useCreateBuildOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBuildOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateBuildOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BuildOrderUpdate) => updateBuildOrder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteBuildOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBuildOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useAllocateBuildOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => allocateBuildOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.allocations(id) });
    },
  });
}

export function useCompleteBuildOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => completeBuildOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.outputs(id) });
    },
  });
}

export function useCancelBuildOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelBuildOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useBuildAllocations(id: number) {
  return useQuery({
    queryKey: KEYS.allocations(id),
    queryFn: () => getBuildAllocations(id),
    enabled: !!id,
  });
}

export function useBuildOutputs(id: number) {
  return useQuery({
    queryKey: KEYS.outputs(id),
    queryFn: () => getBuildOutputs(id),
    enabled: !!id,
  });
}
