import { useQuery } from "@tanstack/react-query";
import apiClient from "./client";

export interface DashboardSummary {
  total_components: number;
  low_stock_count: number;
  checked_out_tools: number;
  upcoming_maintenance: number;
  expiring_subscriptions: number;
  total_machines: number;
  online_machines: number;
  total_software: number;
  recent_transactions: {
    id: number;
    component_name: string;
    quantity_change: number;
    reason: string;
    created_at: string;
  }[];
  components_by_category: {
    category: string;
    count: number;
  }[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>(
        "/dashboard/summary"
      );
      return data;
    },
    refetchInterval: 60_000,
  });
}
