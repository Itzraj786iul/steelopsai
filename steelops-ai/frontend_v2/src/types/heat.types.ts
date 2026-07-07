import type { PaginatedResponse } from "@/types/api.types";

export interface Heat {
  id: string;
  tenant_id: string;
  heat_number: string;
  shift: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  recipe_json: Record<string, unknown>;
  chemistry_json: Record<string, unknown>;
  outcomes_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type HeatListResponse = PaginatedResponse<Heat>;
