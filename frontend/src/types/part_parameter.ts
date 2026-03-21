export interface PartParameter {
  id: number;
  component_id: number;
  name: string;
  symbol: string | null;
  value_text: string | null;
  value_min: number | null;
  value_typical: number | null;
  value_max: number | null;
  unit: string | null;
  group_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface PartParameterCreate {
  name: string;
  symbol?: string;
  value_text?: string;
  value_min?: number;
  value_typical?: number;
  value_max?: number;
  unit?: string;
  group_name?: string;
  sort_order?: number;
}

export interface PartParameterUpdate extends Partial<PartParameterCreate> {}
