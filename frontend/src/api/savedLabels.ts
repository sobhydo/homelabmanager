import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";

export interface SavedLabel {
  id: number;
  name: string;
  paper_size: string;
  template_index: number;
  font_size: number;
  font_weight: string;
  show_border: boolean;
  labels_json: string;
  created_at?: string;
  updated_at?: string;
}

export interface SavedLabelCreate {
  name: string;
  paper_size: string;
  template_index: number;
  font_size: number;
  font_weight: string;
  show_border: boolean;
  labels_json: string;
}

const KEYS = {
  all: ["saved-labels"] as const,
  list: () => [...KEYS.all, "list"] as const,
};

async function getSavedLabels() {
  const { data } = await apiClient.get<SavedLabel[]>("/saved-labels");
  return data;
}

async function createSavedLabel(payload: SavedLabelCreate) {
  const { data } = await apiClient.post<SavedLabel>("/saved-labels", payload);
  return data;
}

async function updateSavedLabel(id: number, payload: Partial<SavedLabelCreate>) {
  const { data } = await apiClient.put<SavedLabel>(`/saved-labels/${id}`, payload);
  return data;
}

async function deleteSavedLabel(id: number) {
  await apiClient.delete(`/saved-labels/${id}`);
}

export function useSavedLabels() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: getSavedLabels,
  });
}

export function useCreateSavedLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSavedLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}

export function useUpdateSavedLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SavedLabelCreate> }) =>
      updateSavedLabel(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}

export function useDeleteSavedLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSavedLabel,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}
