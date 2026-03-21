import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Component,
  ComponentCreate,
  ComponentUpdate,
  StockTransaction,
} from "../types/component";
import type { PartParameter, PartParameterCreate, PartParameterUpdate } from "../types/part_parameter";
import type { PartLot, PartLotCreate, PartLotUpdate } from "../types/part_lot";
import type { Attachment } from "../types/attachment";
import type { SupplierPart, ManufacturerPart } from "../types/supplier";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["components"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
  search: (query: string) => [...KEYS.all, "search", query] as const,
  lowStock: () => [...KEYS.all, "low-stock"] as const,
  transactions: (id: number) => [...KEYS.all, "transactions", id] as const,
  parameters: (id: number) => [...KEYS.all, "parameters", id] as const,
  lots: (id: number) => [...KEYS.all, "lots", id] as const,
  attachments: (id: number) => [...KEYS.all, "attachments", id] as const,
  supplierParts: (id: number) => [...KEYS.all, "supplier-parts", id] as const,
  manufacturerParts: (id: number) => [...KEYS.all, "manufacturer-parts", id] as const,
};

async function getComponents(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Component>>(
    "/components",
    { params }
  );
  return data;
}

async function getComponent(id: number) {
  const { data } = await apiClient.get<Component>(`/components/${id}`);
  return data;
}

async function createComponent(payload: ComponentCreate) {
  const { data } = await apiClient.post<Component>("/components", payload);
  return data;
}

async function updateComponent(id: number, payload: ComponentUpdate) {
  const { data } = await apiClient.put<Component>(
    `/components/${id}`,
    payload
  );
  return data;
}

async function deleteComponent(id: number) {
  await apiClient.delete(`/components/${id}`);
}

async function searchComponents(query: string) {
  const { data } = await apiClient.get<Component[]>("/components/search", {
    params: { q: query },
  });
  return data;
}

async function getLowStockComponents() {
  const { data } = await apiClient.get<Component[]>("/components/low-stock");
  return data;
}

async function getStockTransactions(componentId: number) {
  const { data } = await apiClient.get<StockTransaction[]>(
    `/components/${componentId}/transactions`
  );
  return data;
}

export function useComponents(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getComponents(params),
  });
}

export function useComponent(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getComponent(id),
    enabled: !!id,
  });
}

export function useCreateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createComponent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateComponent(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ComponentUpdate) => updateComponent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteComponent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useSearchComponents(query: string) {
  return useQuery({
    queryKey: KEYS.search(query),
    queryFn: () => searchComponents(query),
    enabled: query.length > 1,
  });
}

export function useLowStockComponents() {
  return useQuery({
    queryKey: KEYS.lowStock(),
    queryFn: getLowStockComponents,
  });
}

export function useStockTransactions(componentId: number) {
  return useQuery({
    queryKey: KEYS.transactions(componentId),
    queryFn: () => getStockTransactions(componentId),
    enabled: !!componentId,
  });
}

// --- Part Parameters ---

async function getComponentParameters(componentId: number) {
  const { data } = await apiClient.get<PartParameter[]>(
    `/components/${componentId}/parameters`
  );
  return data;
}

async function createParameter(componentId: number, payload: PartParameterCreate) {
  const { data } = await apiClient.post<PartParameter>(
    `/components/${componentId}/parameters`,
    payload
  );
  return data;
}

async function updateParameter(componentId: number, parameterId: number, payload: PartParameterUpdate) {
  const { data } = await apiClient.put<PartParameter>(
    `/components/${componentId}/parameters/${parameterId}`,
    payload
  );
  return data;
}

async function deleteParameter(componentId: number, parameterId: number) {
  await apiClient.delete(`/components/${componentId}/parameters/${parameterId}`);
}

export function useComponentParameters(componentId: number) {
  return useQuery({
    queryKey: KEYS.parameters(componentId),
    queryFn: () => getComponentParameters(componentId),
    enabled: !!componentId,
  });
}

export function useCreateParameter(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartParameterCreate) => createParameter(componentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters(componentId) });
    },
  });
}

export function useUpdateParameter(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: PartParameterUpdate & { id: number }) =>
      updateParameter(componentId, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters(componentId) });
    },
  });
}

export function useDeleteParameter(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parameterId: number) => deleteParameter(componentId, parameterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.parameters(componentId) });
    },
  });
}

// --- Part Lots ---

async function getComponentLots(componentId: number) {
  const { data } = await apiClient.get<PartLot[]>(
    `/components/${componentId}/lots`
  );
  return data;
}

async function createLot(componentId: number, payload: PartLotCreate) {
  const { data } = await apiClient.post<PartLot>(
    `/components/${componentId}/lots`,
    payload
  );
  return data;
}

async function updateLot(componentId: number, lotId: number, payload: PartLotUpdate) {
  const { data } = await apiClient.put<PartLot>(
    `/components/${componentId}/lots/${lotId}`,
    payload
  );
  return data;
}

async function deleteLot(componentId: number, lotId: number) {
  await apiClient.delete(`/components/${componentId}/lots/${lotId}`);
}

export function useComponentLots(componentId: number) {
  return useQuery({
    queryKey: KEYS.lots(componentId),
    queryFn: () => getComponentLots(componentId),
    enabled: !!componentId,
  });
}

export function useCreateLot(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartLotCreate) => createLot(componentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lots(componentId) });
    },
  });
}

export function useUpdateLot(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: PartLotUpdate & { id: number }) =>
      updateLot(componentId, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lots(componentId) });
    },
  });
}

export function useDeleteLot(componentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lotId: number) => deleteLot(componentId, lotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lots(componentId) });
    },
  });
}

// --- Attachments ---

async function getComponentAttachments(componentId: number) {
  const { data } = await apiClient.get<Attachment[]>("/attachments", {
    params: { entity_type: "component", entity_id: componentId },
  });
  return data;
}

export function useComponentAttachments(componentId: number) {
  return useQuery({
    queryKey: KEYS.attachments(componentId),
    queryFn: () => getComponentAttachments(componentId),
    enabled: !!componentId,
  });
}

// --- Supplier Parts for a Component ---

async function getComponentSupplierParts(componentId: number) {
  const { data } = await apiClient.get<SupplierPart[]>(
    `/components/${componentId}/supplier-parts`
  );
  return data;
}

export function useComponentSupplierParts(componentId: number) {
  return useQuery({
    queryKey: KEYS.supplierParts(componentId),
    queryFn: () => getComponentSupplierParts(componentId),
    enabled: !!componentId,
  });
}

// --- Manufacturer Parts for a Component ---

async function getComponentManufacturerParts(componentId: number) {
  const { data } = await apiClient.get<ManufacturerPart[]>(
    `/components/${componentId}/manufacturer-parts`
  );
  return data;
}

export function useComponentManufacturerParts(componentId: number) {
  return useQuery({
    queryKey: KEYS.manufacturerParts(componentId),
    queryFn: () => getComponentManufacturerParts(componentId),
    enabled: !!componentId,
  });
}
