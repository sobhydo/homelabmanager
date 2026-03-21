export interface Supplier {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SupplierCreate {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface SupplierUpdate extends Partial<SupplierCreate> {
  is_active?: boolean;
}

export interface Manufacturer {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ManufacturerCreate {
  name: string;
  description?: string;
  website?: string;
  notes?: string;
}

export interface ManufacturerUpdate extends Partial<ManufacturerCreate> {
  is_active?: boolean;
}

export interface SupplierPart {
  id: number;
  component_id: number;
  supplier_id: number;
  supplier_part_number: string | null;
  unit_price: number | null;
  currency: string;
  pack_quantity: number;
  lead_time_days: number | null;
  url: string | null;
  notes: string | null;
  is_active: boolean;
  supplier_name: string;
  component_name: string;
  created_at: string;
}

export interface ManufacturerPart {
  id: number;
  component_id: number;
  manufacturer_id: number;
  manufacturer_part_number: string;
  description: string | null;
  url: string | null;
  manufacturer_name: string;
  component_name: string;
  created_at: string;
}
