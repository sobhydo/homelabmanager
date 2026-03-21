import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  Machine,
  MachineCreate,
  MachineUpdate,
  MaintenanceTask,
  MaintenanceTaskCreate,
  MaintenanceTaskUpdate,
} from "../types/machine";
import type { PaginatedResponse, PaginationParams } from "../types/common";

const KEYS = {
  all: ["machines"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: PaginationParams) => [...KEYS.lists(), params] as const,
  detail: (id: number) => [...KEYS.all, "detail", id] as const,
  maintenance: (id: number) => [...KEYS.all, "maintenance", id] as const,
};

export function useMachines(params: PaginationParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Machine>>(
        "/machines",
        { params }
      );
      return data;
    },
  });
}

export function useMachine(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Machine>(`/machines/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MachineCreate) => {
      const { data } = await apiClient.post<Machine>("/machines", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useUpdateMachine(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MachineUpdate) => {
      const { data } = await apiClient.put<Machine>(
        `/machines/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/machines/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() });
    },
  });
}

export function useMaintenanceTasks(machineId: number) {
  return useQuery({
    queryKey: KEYS.maintenance(machineId),
    queryFn: async () => {
      const { data } = await apiClient.get<MaintenanceTask[]>(
        `/machines/${machineId}/maintenance`
      );
      return data;
    },
    enabled: !!machineId,
  });
}

export function useCreateMaintenanceTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaintenanceTaskCreate) => {
      const { data } = await apiClient.post<MaintenanceTask>(
        `/machines/${payload.machine_id}/maintenance`,
        payload
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: KEYS.maintenance(variables.machine_id),
      });
    },
  });
}

export function useUpdateMaintenanceTask(machineId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      payload,
    }: {
      taskId: number;
      payload: MaintenanceTaskUpdate;
    }) => {
      const { data } = await apiClient.put<MaintenanceTask>(
        `/machines/${machineId}/maintenance/${taskId}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.maintenance(machineId) });
    },
  });
}
