import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  StockLocation,
  StockLocationCreate,
  StockLocationUpdate,
  StockLocationTree,
  StockItem,
  StockItemCreate,
  StockItemUpdate,
} from "../types/stock";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  locations: ["stock-locations"] as const,
  locationLists: () => [...KEYS.locations, "list"] as const,
  locationList: (parentId?: number | null) =>
    [...KEYS.locationLists(), { parentId }] as const,
  locationTree: () => [...KEYS.locations, "tree"] as const,
  locationDetails: () => [...KEYS.locations, "detail"] as const,
  locationDetail: (id: number) => [...KEYS.locationDetails(), id] as const,
  locationStock: (id: number) => [...KEYS.locations, "stock", id] as const,
  items: ["stock-items"] as const,
  itemLists: () => [...KEYS.items, "list"] as const,
  itemList: (params: PaginationParams) =>
    [...KEYS.itemLists(), params] as const,
  itemDetails: () => [...KEYS.items, "detail"] as const,
  itemDetail: (id: number) => [...KEYS.itemDetails(), id] as const,
};

// --- Stock Locations ---

async function getStockLocations(parentId?: number | null) {
  const params: Record<string, unknown> = {};
  if (parentId !== undefined && parentId !== null) {
    params.parent_id = parentId;
  }
  const { data } = await apiClient.get<StockLocation[]>("/stock-locations", {
    params,
  });
  return data;
}

async function getStockLocationTree() {
  const { data } = await apiClient.get<StockLocationTree[]>(
    "/stock-locations/tree"
  );
  return data;
}

async function getStockLocation(id: number) {
  const { data } = await apiClient.get<StockLocation>(
    `/stock-locations/${id}`
  );
  return data;
}

async function createStockLocation(payload: StockLocationCreate) {
  const { data } = await apiClient.post<StockLocation>(
    "/stock-locations",
    payload
  );
  return data;
}

async function updateStockLocation(id: number, payload: StockLocationUpdate) {
  const { data } = await apiClient.put<StockLocation>(
    `/stock-locations/${id}`,
    payload
  );
  return data;
}

async function deleteStockLocation(id: number) {
  await apiClient.delete(`/stock-locations/${id}`);
}

async function getLocationStock(locationId: number) {
  const { data } = await apiClient.get<StockItem[]>(
    `/stock-locations/${locationId}/stock`
  );
  return data;
}

// --- Stock Items ---

async function getStockItems(params: PaginationParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<StockItem>>(
    "/stock",
    { params }
  );
  return data;
}

async function getStockItem(id: number) {
  const { data } = await apiClient.get<StockItem>(`/stock/${id}`);
  return data;
}

async function createStockItem(payload: StockItemCreate) {
  // Stock items must be created at a location via the stock-locations endpoint
  const locationId = payload.location_id;
  if (!locationId) {
    throw new Error("location_id is required to create a stock item");
  }
  const { data } = await apiClient.post<StockItem>(
    `/stock-locations/${locationId}/stock`,
    payload
  );
  return data;
}

async function updateStockItem(id: number, payload: StockItemUpdate) {
  const { data } = await apiClient.put<StockItem>(`/stock/${id}`, payload);
  return data;
}

async function moveStockItem(id: number, locationId: number | null) {
  const { data } = await apiClient.post<StockItem>(`/stock/${id}/move`, {
    location_id: locationId,
  });
  return data;
}

async function adjustStockItem(
  id: number,
  quantity: number,
  reason?: string
) {
  const { data } = await apiClient.post<StockItem>(`/stock/${id}/adjust`, {
    quantity,
    reason,
  });
  return data;
}

// --- Hooks: Stock Locations ---

export function useStockLocations(parentId?: number | null) {
  return useQuery({
    queryKey: KEYS.locationList(parentId),
    queryFn: () => getStockLocations(parentId),
  });
}

export function useStockLocationTree() {
  return useQuery({
    queryKey: KEYS.locationTree(),
    queryFn: getStockLocationTree,
  });
}

export function useStockLocation(id: number) {
  return useQuery({
    queryKey: KEYS.locationDetail(id),
    queryFn: () => getStockLocation(id),
    enabled: !!id,
  });
}

export function useCreateStockLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStockLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationTree() });
    },
  });
}

export function useUpdateStockLocation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockLocationUpdate) =>
      updateStockLocation(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationDetail(id) });
      qc.invalidateQueries({ queryKey: KEYS.locationTree() });
    },
  });
}

export function useDeleteStockLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStockLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationTree() });
    },
  });
}

export function useLocationStock(locationId: number) {
  return useQuery({
    queryKey: KEYS.locationStock(locationId),
    queryFn: () => getLocationStock(locationId),
    enabled: !!locationId,
  });
}

// --- Hooks: Stock Items ---

export function useStockItems(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.itemList(params),
    queryFn: () => getStockItems(params),
  });
}

export function useStockItem(id: number) {
  return useQuery({
    queryKey: KEYS.itemDetail(id),
    queryFn: () => getStockItem(id),
    enabled: !!id,
  });
}

export function useCreateStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStockItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.itemLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
    },
  });
}

export function useUpdateStockItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockItemUpdate) => updateStockItem(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.itemLists() });
      qc.invalidateQueries({ queryKey: KEYS.itemDetail(id) });
    },
  });
}

export function useMoveStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      locationId,
    }: {
      id: number;
      locationId: number | null;
    }) => moveStockItem(id, locationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.itemLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
    },
  });
}

export function useAdjustStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      quantity,
      reason,
    }: {
      id: number;
      quantity: number;
      reason?: string;
    }) => adjustStockItem(id, quantity, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.itemLists() });
      qc.invalidateQueries({ queryKey: KEYS.locationLists() });
    },
  });
}
