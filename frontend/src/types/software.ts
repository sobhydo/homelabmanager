export interface Software {
  id: number;
  name: string;
  version?: string;
  description?: string;
  category?: string;
  license_type?: string;
  license_key?: string;
  vendor?: string;
  url?: string;
  installed_on?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SoftwareCreate {
  name: string;
  version?: string;
  description?: string;
  category?: string;
  license_type?: string;
  license_key?: string;
  vendor?: string;
  url?: string;
  installed_on?: string;
  status?: string;
  notes?: string;
}

export type SoftwareUpdate = Partial<SoftwareCreate>;

export interface Subscription {
  id: number;
  name: string;
  provider?: string;
  description?: string;
  cost?: number;
  billing_cycle: string;
  start_date?: string;
  expiry_date?: string;
  auto_renew: number;
  category?: string;
  url?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionCreate {
  name: string;
  provider?: string;
  description?: string;
  cost?: number;
  billing_cycle?: string;
  start_date?: string;
  expiry_date?: string;
  auto_renew?: number;
  category?: string;
  url?: string;
  status?: string;
  notes?: string;
}

export type SubscriptionUpdate = Partial<SubscriptionCreate>;

export const LICENSE_TYPES = [
  "Perpetual",
  "Subscription",
  "Open Source",
  "Freeware",
  "Trial",
  "OEM",
  "Volume",
  "Other",
] as const;

export const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
] as const;
