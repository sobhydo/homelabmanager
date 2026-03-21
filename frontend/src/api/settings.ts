import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { SystemSetting } from "../types/user";

const KEYS = {
  all: ["settings"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  detail: (key: string) => [...KEYS.all, "detail", key] as const,
};

async function getSettings() {
  const { data } = await apiClient.get<Record<string, SystemSetting[]>>("/settings");
  return data;
}

async function getSetting(key: string) {
  const { data } = await apiClient.get<SystemSetting>(`/settings/${key}`);
  return data;
}

async function updateSetting(key: string, value: string | null) {
  const { data } = await apiClient.put<SystemSetting>(`/settings/${key}`, {
    value,
  });
  return data;
}

async function bulkUpdateSettings(
  settings: Array<{ key: string; value: string | null }>
) {
  const { data } = await apiClient.put<SystemSetting[]>(
    "/settings/bulk",
    settings
  );
  return data;
}

export function useSettings() {
  return useQuery({
    queryKey: KEYS.lists(),
    queryFn: getSettings,
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: KEYS.detail(key),
    queryFn: () => getSetting(key),
    enabled: !!key,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string | null }) =>
      updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useBulkUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkUpdateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
