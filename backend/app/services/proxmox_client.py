from typing import Any

import httpx


class ProxmoxClient:
    """Async HTTP client for the Proxmox VE API."""

    def __init__(
        self,
        host: str,
        port: int = 8006,
        token_name: str | None = None,
        token_value: str | None = None,
        verify_ssl: bool = False,
    ):
        self.base_url = f"https://{host}:{port}/api2/json"
        self.headers: dict[str, str] = {}
        if token_name and token_value:
            self.headers["Authorization"] = f"PVEAPIToken={token_name}={token_value}"
        self.verify_ssl = verify_ssl

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Make an authenticated request to the Proxmox API."""
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(verify=self.verify_ssl, timeout=30.0) as client:
            response = await client.request(
                method, url, headers=self.headers, **kwargs
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", data)

    async def get_nodes(self) -> list[dict[str, Any]]:
        """Get status of all nodes in the cluster."""
        raw_nodes = await self._request("GET", "/nodes")
        nodes = []
        for n in raw_nodes:
            nodes.append({
                "node": n.get("node", ""),
                "status": n.get("status", "unknown"),
                "cpu": n.get("cpu"),
                "memory_used": n.get("mem"),
                "memory_total": n.get("maxmem"),
                "disk_used": n.get("disk"),
                "disk_total": n.get("maxdisk"),
                "uptime": n.get("uptime"),
            })
        return nodes

    async def get_vms(self) -> list[dict[str, Any]]:
        """Get all VMs and containers across all nodes."""
        nodes = await self._request("GET", "/nodes")
        vms: list[dict[str, Any]] = []

        for node_info in nodes:
            node_name = node_info.get("node", "")

            # Fetch QEMU VMs
            try:
                qemu_vms = await self._request("GET", f"/nodes/{node_name}/qemu")
                for vm in qemu_vms:
                    vms.append({
                        "vmid": vm.get("vmid"),
                        "name": vm.get("name"),
                        "status": vm.get("status", "unknown"),
                        "node": node_name,
                        "vm_type": "qemu",
                        "cpu": vm.get("cpu"),
                        "memory": vm.get("mem"),
                        "disk": vm.get("disk"),
                        "uptime": vm.get("uptime"),
                        "tags": vm.get("tags"),
                    })
            except Exception:
                pass

            # Fetch LXC containers
            try:
                lxc_vms = await self._request("GET", f"/nodes/{node_name}/lxc")
                for vm in lxc_vms:
                    vms.append({
                        "vmid": vm.get("vmid"),
                        "name": vm.get("name"),
                        "status": vm.get("status", "unknown"),
                        "node": node_name,
                        "vm_type": "lxc",
                        "cpu": vm.get("cpu"),
                        "memory": vm.get("mem"),
                        "disk": vm.get("disk"),
                        "uptime": vm.get("uptime"),
                        "tags": vm.get("tags"),
                    })
            except Exception:
                pass

        return vms

    async def vm_action(
        self, node: str, vmid: int, action: str, vm_type: str = "qemu"
    ) -> dict[str, Any]:
        """Perform an action on a VM (start, stop, restart).

        Args:
            node: Node name.
            vmid: VM ID.
            action: One of 'start', 'stop', 'restart'.
            vm_type: 'qemu' or 'lxc'.

        Returns:
            API response data.
        """
        action_map = {
            "start": "start",
            "stop": "stop",
            "restart": "reboot",
        }
        api_action = action_map.get(action, action)
        path = f"/nodes/{node}/{vm_type}/{vmid}/status/{api_action}"
        return await self._request("POST", path)
