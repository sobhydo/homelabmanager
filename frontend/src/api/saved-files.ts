import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { SavedFile } from "../types/saved-file";
import type { PaginatedResponse } from "../types/common";

const KEYS = {
  all: ["saved-files"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (category?: string) => [...KEYS.lists(), category] as const,
};

export function useSavedFiles(category?: string) {
  return useQuery({
    queryKey: KEYS.list(category),
    queryFn: async () => {
      const params: Record<string, string> = { page_size: "200" };
      if (category) params.category = category;
      const { data } = await apiClient.get<PaginatedResponse<SavedFile>>(
        "/saved-files",
        { params }
      );
      return data;
    },
  });
}

export function useUploadSavedFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      name,
      category,
      notes,
    }: {
      file: File;
      name: string;
      category: string;
      notes?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      formData.append("category", category);
      if (notes) formData.append("notes", notes);
      const { data } = await apiClient.post<SavedFile>(
        "/saved-files",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useDeleteSavedFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/saved-files/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function getSavedFileDownloadUrl(id: number): string {
  return `/saved-files/${id}/download`;
}
