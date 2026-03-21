import { useQuery } from "@tanstack/react-query";
import apiClient from "./client";
import type { AuditLog } from "../types/user";
import type { PaginatedResponse } from "../types/common";

interface AuditLogParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
}

const KEYS = {
  all: ["audit-logs"] as const,
  lists: () => [...KEYS.all, "list"] as const,
  list: (params: AuditLogParams) => [...KEYS.lists(), params] as const,
};

async function getAuditLogs(params: AuditLogParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<AuditLog>>(
    "/audit-logs",
    { params }
  );
  return data;
}

export function useAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => getAuditLogs(params),
  });
}
