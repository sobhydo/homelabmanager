from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ProxmoxServerBase(BaseModel):
    name: str
    host: str
    port: int = 8006
    username: Optional[str] = None
    token_name: Optional[str] = None
    token_value: Optional[str] = None
    verify_ssl: int = 0
    notes: Optional[str] = None


class ProxmoxServerCreate(ProxmoxServerBase):
    pass


class ProxmoxServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    token_name: Optional[str] = None
    token_value: Optional[str] = None
    verify_ssl: Optional[int] = None
    notes: Optional[str] = None


class ProxmoxServerResponse(ProxmoxServerBase):
    id: int
    status: str = "unknown"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NodeStatus(BaseModel):
    node: str
    status: str
    cpu: Optional[float] = None
    memory_used: Optional[int] = None
    memory_total: Optional[int] = None
    disk_used: Optional[int] = None
    disk_total: Optional[int] = None
    uptime: Optional[int] = None


class VmInfo(BaseModel):
    vmid: int
    name: Optional[str] = None
    status: str
    node: str
    vm_type: str = "qemu"
    cpu: Optional[float] = None
    memory: Optional[int] = None
    disk: Optional[int] = None
    uptime: Optional[int] = None
    tags: Optional[str] = None


class VmAction(BaseModel):
    action: str  # start, stop, restart
    node: Optional[str] = None
