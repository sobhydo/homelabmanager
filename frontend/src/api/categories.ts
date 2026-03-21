import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Category,
  CategoryCreate,
  CategoryUpdate,
  CategoryTree,
} from "../types/category";

const KEYS = {
  all: ["categories"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (parentId?: number | null) => [...KEYS.lists(), { parentId }] as const,
  tree: () => [...KEYS.all, "tree"] as const,
  details: () => [...KEYS.all, "detail"] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
};

async function getCategories(parentId?: number | null) {
  const params: Record<string, unknown> = {};
  if (parentId !== undefined && parentId !== null) {
    params.parent_id = parentId;
  }
  const { data } = await apiClient.get<Category[]>("/categories", { params });
  return data;
}

async function getCategoryTree() {
  const { data } = await apiClient.get<CategoryTree[]>("/categories/tree");
  return data;
}

async function getCategory(id: number) {
  const { data } = await apiClient.get<Category>(`/categories/${id}`);
  return data;
}

async function createCategory(payload: CategoryCreate) {
  const { data } = await apiClient.post<Category>("/categories", payload);
  return data;
}

async function updateCategory(id: number, payload: CategoryUpdate) {
  const { data } = await apiClient.put<Category>(`/categories/${id}`, payload);
  return data;
}

async function deleteCategory(id: number) {
  await apiClient.delete(`/categories/${id}`);
}

export function useCategories(parentId?: number | null) {
  return useQuery({
    queryKey: KEYS.list(parentId),
    queryFn: () => getCategories(parentId),
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: KEYS.tree(),
    queryFn: getCategoryTree,
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getCategory(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.tree() });
    },
  });
}

export function useUpdateCategory(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryUpdate) => updateCategory(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.tree() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.tree() });
    },
  });
}
