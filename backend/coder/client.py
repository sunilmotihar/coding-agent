import asyncio
import httpx
from backend.config import settings


class CoderClient:
    def __init__(self):
        self.base = settings.coder_url
        self.headers = {"Coder-Session-Token": settings.coder_token}

    async def get_template_id(self) -> str:
        """Look up the template UUID by name."""
        async with httpx.AsyncClient() as c:
            r = await c.get(
                f"{self.base}/api/v2/organizations/{settings.coder_org_id}/templates",
                headers=self.headers,
                timeout=10,
            )
            r.raise_for_status()
            for t in r.json():
                if t["name"] == settings.coder_template_name:
                    return t["id"]
        raise RuntimeError(f"Template '{settings.coder_template_name}' not found")

    async def provision_workspace(self, name: str) -> dict:
        template_id = await self.get_template_id()
        async with httpx.AsyncClient() as c:
            r = await c.post(
                f"{self.base}/api/v2/organizations/{settings.coder_org_id}/members/me/workspaces",
                headers=self.headers,
                json={
                    "name": name,
                    "template_id": template_id,
                    "ttl_ms": 3600000,
                },
                timeout=30,
            )
            r.raise_for_status()
            return r.json()

    async def get_workspace(self, workspace_id: str) -> dict:
        async with httpx.AsyncClient() as c:
            r = await c.get(
                f"{self.base}/api/v2/workspaces/{workspace_id}",
                headers=self.headers,
                timeout=10,
            )
            r.raise_for_status()
            return r.json()

    async def delete_workspace(self, workspace_id: str) -> None:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                f"{self.base}/api/v2/workspaces/{workspace_id}/builds",
                headers=self.headers,
                json={"transition": "delete", "orphan": False},
                timeout=10,
            )
            r.raise_for_status()

    async def wait_ready(self, workspace_id: str, timeout: int = 180) -> None:
        import time
        deadline = time.time() + timeout
        while time.time() < deadline:
            ws = await self.get_workspace(workspace_id)
            status = ws["latest_build"]["status"]
            if status in ("failed", "canceled"):
                raise RuntimeError(f"Workspace build {status}")
            # Wait for both the build to be running AND the agent to be healthy
            # (healthy means the agent has connected back to Coder and SSH works)
            if status == "running" and ws.get("health", {}).get("healthy", False):
                return
            await asyncio.sleep(3)
        raise TimeoutError("Workspace did not start within timeout")
