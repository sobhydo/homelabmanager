export interface ProxmoxServer {
  id: number;
  name: string;
  host: string;
  port: number;
  username?: string;
  token_name?: string;
  token_value?: string;
  verify_ssl: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxmoxServerCreate {
  name: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
  token_name?: string;
  token_value?: string;
  verify_ssl?: number;
  notes?: string;
}

export type ProxmoxServerUpdate = Partial<ProxmoxServerCreate>;

export interface ProxmoxNode {
  node: string;
  status: string;
  cpu?: number;
  memory_used?: number;
  memory_total?: number;
  disk_used?: number;
  disk_total?: number;
  uptime?: number;
}

export interface ProxmoxVM {
  vmid: number;
  name?: string;
  status: string;
  node: string;
  vm_type: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  uptime?: number;
  tags?: string;
}

export interface ProxmoxNodeDetail {
  nodes: ProxmoxNode[];
  vms: ProxmoxVM[];
}
