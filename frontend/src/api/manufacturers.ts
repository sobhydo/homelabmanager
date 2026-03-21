import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Manufacturer,
  ManufacturerCreate,
  ManufacturerUpdate,
  ManufacturerPart,
} from "../types/supplier";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["manufacturers"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
  parts: (id: number) => [...KEYS.all, "parts", id] as const,
};

async function getManufacturers(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Manufacturer>>(
    "/manufacturers",
    { params }
  );
  return data;
}

async function getManufacturer(id: number) {
  const { data } = await apiClient.get<Manufacturer>(`/manufacturers/${id}`);
  return data;
}

async function createManufacturer(payload: ManufacturerCreate) {
  const { data } = await apiClient.post<Manufacturer>(
    "/manufacturers",
    payload
  );
  return data;
}

async function updateManufacturer(id: number, payload: ManufacturerUpdate) {
  const { data } = await apiClient.put<Manufacturer>(
    `/manufacturers/${id}`,
    payload
  );
  return data;
}

async function deleteManufacturer(id: number) {
  await apiClient.delete(`/manufacturers/${id}`);
}

async function getManufacturerParts(manufacturerId: number) {
  const { data } = await apiClient.get<ManufacturerPart[]>(
    `/manufacturers/${manufacturerId}/parts`
  );
  return data;
}

export function useManufacturers(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getManufacturers(params),
  });
}

export function useManufacturer(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getManufacturer(id),
    enabled: !!id,
  });
}

export function useCreateManufacturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createManufacturer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateManufacturer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManufacturerUpdate) =>
      updateManufacturer(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteManufacturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteManufacturer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useManufacturerParts(manufacturerId: number) {
  return useQuery({
    queryKey: KEYS.parts(manufacturerId),
    queryFn: () => getManufacturerParts(manufacturerId),
    enabled: !!manufacturerId,
  });
}
