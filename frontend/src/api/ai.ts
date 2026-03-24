import { useMutation } from "@tanstack/react-query";
import apiClient from "./client";

interface SuggestRequest {
  field_name: string;
  current_value?: string;
  context?: Record<string, unknown>;
  entity_type?: string;
}

interface SuggestResponse {
  suggestion: string;
}

export function useAISuggest() {
  return useMutation({
    mutationFn: async (req: SuggestRequest) => {
      const { data } = await apiClient.post<SuggestResponse>(
        "/ai/suggest",
        req
      );
      return data;
    },
  });
}
