from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.proxmox import ProxmoxServer
from app.schemas.proxmox import (
    NodeStatus,
    ProxmoxServerCreate,
    ProxmoxServerResponse,
    ProxmoxServerUpdate,
    VmAction,
    VmInfo,
)
from app.services.proxmox_client import ProxmoxClient

router = APIRouter(prefix="/proxmox", tags=["proxmox"])


@router.get("/servers", response_model=list[ProxmoxServerResponse])
def list_servers(db: Session = Depends(get_db)):
    """List all Proxmox servers."""
    return db.query(ProxmoxServer).all()


@router.post("/servers", response_model=ProxmoxServerResponse, status_code=201)
def create_server(data: ProxmoxServerCreate, db: Session = Depends(get_db)):
    """Add a Proxmox server."""
    server = ProxmoxServer(**data.model_dump())
    db.add(server)
    db.commit()
    db.refresh(server)
    return server


@router.get("/servers/{server_id}", response_model=ProxmoxServerResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    """Get a Proxmox server by ID."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.put("/servers/{server_id}", response_model=ProxmoxServerResponse)
def update_server(
    server_id: int, data: ProxmoxServerUpdate, db: Session = Depends(get_db)
):
    """Update a Proxmox server."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(server, field, value)
    db.commit()
    db.refresh(server)
    return server


@router.delete("/servers/{server_id}", status_code=204)
def delete_server(server_id: int, db: Session = Depends(get_db)):
    """Delete a Proxmox server."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    db.delete(server)
    db.commit()


@router.get("/servers/{server_id}/status", response_model=list[NodeStatus])
async def get_server_status(server_id: int, db: Session = Depends(get_db)):
    """Get node status from a Proxmox server."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    client = ProxmoxClient(
        host=server.host,
        port=server.port,
        token_name=server.token_name,
        token_value=server.token_value,
        verify_ssl=bool(server.verify_ssl),
    )
    try:
        nodes = await client.get_nodes()
        return nodes
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Proxmox: {e}")


@router.post("/servers/{server_id}/sync")
async def sync_server(server_id: int, db: Session = Depends(get_db)):
    """Sync data from a Proxmox server (refresh cached state)."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    client = ProxmoxClient(
        host=server.host,
        port=server.port,
        token_name=server.token_name,
        token_value=server.token_value,
        verify_ssl=bool(server.verify_ssl),
    )
    try:
        nodes = await client.get_nodes()
        return {"server_id": server_id, "status": "synced", "nodes": len(nodes)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to sync with Proxmox: {e}")


@router.get("/servers/{server_id}/vms", response_model=list[VmInfo])
async def get_server_vms(server_id: int, db: Session = Depends(get_db)):
    """List all VMs/containers on a Proxmox server."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    client = ProxmoxClient(
        host=server.host,
        port=server.port,
        token_name=server.token_name,
        token_value=server.token_value,
        verify_ssl=bool(server.verify_ssl),
    )
    try:
        vms = await client.get_vms()
        return vms
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Proxmox: {e}")


@router.post("/servers/{server_id}/vms/{vmid}/action")
async def vm_action(
    server_id: int, vmid: int, data: VmAction, db: Session = Depends(get_db)
):
    """Perform an action (start/stop/restart) on a VM."""
    server = db.query(ProxmoxServer).filter(ProxmoxServer.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if data.action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action. Use start, stop, or restart.")

    client = ProxmoxClient(
        host=server.host,
        port=server.port,
        token_name=server.token_name,
        token_value=server.token_value,
        verify_ssl=bool(server.verify_ssl),
    )
    try:
        result = await client.vm_action(
            node=data.node or "pve",
            vmid=vmid,
            action=data.action,
        )
        return {"vmid": vmid, "action": data.action, "result": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to execute action: {e}")
