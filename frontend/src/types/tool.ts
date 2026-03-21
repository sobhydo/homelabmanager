export interface Tool {
  id: number;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model_number?: string;
  serial_number?: string;
  condition: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolCreate {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  model_number?: string;
  serial_number?: string;
  condition?: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  status?: string;
  notes?: string;
}

export type ToolUpdate = Partial<ToolCreate>;

export interface Material {
  id: number;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  location?: string;
  supplier?: string;
  unit_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialCreate {
  name: string;
  description?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  min_quantity?: number;
  location?: string;
  supplier?: string;
  unit_price?: number;
  notes?: string;
}

export type MaterialUpdate = Partial<MaterialCreate>;

export const TOOL_CATEGORIES = [
  "Hand Tool",
  "Power Tool",
  "Soldering",
  "Measurement",
  "Cutting",
  "3D Printing",
  "Safety",
  "Storage",
  "Other",
] as const;

export const MATERIAL_CATEGORIES = [
  "Filament",
  "Resin",
  "Solder",
  "Wire",
  "Tape",
  "Adhesive",
  "Chemical",
  "Hardware",
  "Other",
] as const;
