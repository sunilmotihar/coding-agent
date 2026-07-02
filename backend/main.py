import asyncio
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ws.manager import manager
from backend.agent.state import AgentState
from backend.agent.loop import run_agent, resolve_approval

app = FastAPI(title="Coding Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_sessions: dict[str, AgentState] = {}


class StartRequest(BaseModel):
    task: str
    repo_url: str
    autonomous: bool = False


@app.post("/api/sessions")
async def create_session(req: StartRequest):
    state = AgentState(task=req.task, repo_url=req.repo_url, autonomous=req.autonomous)
    _sessions[state.session_id] = state
    asyncio.create_task(run_agent(state))
    return {"session_id": state.session_id}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(ws: WebSocket, session_id: str):
    await manager.connect(session_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            if msg.get("type") == "user_approval":
                resolve_approval(session_id, msg["payload"])
    except WebSocketDisconnect:
        resolve_approval(session_id, {"action": "reject", "reason": "Client disconnected"})
        manager.disconnect(session_id)


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    state = _sessions.get(session_id)
    if not state:
        return {"error": "not found"}
    return {
        "phase": state.phase,
        "plan": [{"index": s.index, "title": s.title, "status": s.status} for s in state.plan],
        "pr_url": state.pr_url,
        "error": state.error,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
