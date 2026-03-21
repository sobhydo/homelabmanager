export interface PartLot {
  id: number;
  component_id: number;
  location_id: number | null;
  quantity: number;
  description: string | null;
  expiry_date: string | null;
  needs_refill: boolean;
  location_name: string | null;
  created_at: string;
}

export interface PartLotCreate {
  location_id?: number;
  quantity: number;
  description?: string;
  expiry_date?: string;
  needs_refill?: boolean;
}

export interface PartLotUpdate extends Partial<PartLotCreate> {}
