import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type {
  ProxmoxServer,
  ProxmoxServerCreate,
  ProxmoxServerUpdate,
  ProxmoxNode,
  ProxmoxVM,
} from "../types/proxmox";

const KEYS = {
  all: ["proxmox"] as const,
  servers: () => [...KEYS.all, "servers"] as const,
  server: (id: number) => [...KEYS.all, "server", id] as const,
  node: (serverId: number) => [...KEYS.all, "node", serverId] as const,
};

export function useProxmoxServers() {
  return useQuery({
    queryKey: KEYS.servers(),
    queryFn: async () => {
      const { data } = await apiClient.get<ProxmoxServer[]>(
        "/proxmox/servers"
      );
      return data;
    },
  });
}

export function useProxmoxServer(id: number) {
  return useQuery({
    queryKey: KEYS.server(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ProxmoxServer>(
        `/proxmox/servers/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useProxmoxNodes(serverId: number) {
  return useQuery({
    queryKey: [...KEYS.all, "nodes", serverId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProxmoxNode[]>(
        `/proxmox/servers/${serverId}/status`
      );
      return data;
    },
    enabled: !!serverId,
    refetchInterval: 30_000,
  });
}

export function useProxmoxVMs(serverId: number) {
  return useQuery({
    queryKey: [...KEYS.all, "vms", serverId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProxmoxVM[]>(
        `/proxmox/servers/${serverId}/vms`
      );
      return data;
    },
    enabled: !!serverId,
    refetchInterval: 30_000,
  });
}

export function useCreateProxmoxServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProxmoxServerCreate) => {
      const { data } = await apiClient.post<ProxmoxServer>(
        "/proxmox/servers",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.servers() });
    },
  });
}

export function useUpdateProxmoxServer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProxmoxServerUpdate) => {
      const { data } = await apiClient.put<ProxmoxServer>(
        `/proxmox/servers/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.servers() });
      qc.invalidateQueries({ queryKey: KEYS.server(id) });
    },
  });
}

export function useDeleteProxmoxServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/proxmox/servers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.servers() });
    },
  });
}

export function useSyncProxmoxServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/proxmox/servers/${id}/sync`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
