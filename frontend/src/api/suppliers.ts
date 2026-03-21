import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  SupplierPart,
} from "../types/supplier";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["suppliers"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
  parts: (id: number) => [...KEYS.all, "parts", id] as const,
};

async function getSuppliers(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Supplier>>(
    "/suppliers",
    { params }
  );
  return data;
}

async function getSupplier(id: number) {
  const { data } = await apiClient.get<Supplier>(`/suppliers/${id}`);
  return data;
}

async function createSupplier(payload: SupplierCreate) {
  const { data } = await apiClient.post<Supplier>("/suppliers", payload);
  return data;
}

async function updateSupplier(id: number, payload: SupplierUpdate) {
  const { data } = await apiClient.put<Supplier>(
    `/suppliers/${id}`,
    payload
  );
  return data;
}

async function deleteSupplier(id: number) {
  await apiClient.delete(`/suppliers/${id}`);
}

async function getSupplierParts(supplierId: number) {
  const { data } = await apiClient.get<SupplierPart[]>(
    `/suppliers/${supplierId}/parts`
  );
  return data;
}

export function useSuppliers(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getSuppliers(params),
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getSupplier(id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateSupplier(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierUpdate) => updateSupplier(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useSupplierParts(supplierId: number) {
  return useQuery({
    queryKey: KEYS.parts(supplierId),
    queryFn: () => getSupplierParts(supplierId),
    enabled: !!supplierId,
  });
}
