import asyncio
import re
import time
from datetime import datetime

from backend.agent.state import AgentState, AgentPhase, PlanStep
from backend.agent.context import build_context
from backend.agent.planner import generate_plan
from backend.agent.executor import execute_step
from backend.coder.client import CoderClient
from backend.coder.ssh import coder_exec
from backend.github.pr import create_pr
from backend.ws.manager import manager

REPO_PATH = "/home/coder/repo"

# Approval gates: session_id -> asyncio.Future
_approval_events: dict[str, asyncio.Future] = {}


async def run_agent(state: AgentState):
    emit = lambda t, p: manager.send(state.session_id, t, p)

    async def transition(phase: AgentPhase, **extra):
        state.phase = phase
        await emit("phase_change", {"phase": phase.value, **extra})

    try:
        # ── PROVISIONING_WORKSPACE ──────────────────────────────────────────
        await transition(AgentPhase.PROVISIONING_WORKSPACE)
        coder = CoderClient()
        ws_name = f"agent-{state.session_id[:8]}"
        workspace = await coder.provision_workspace(ws_name)
        state.workspace_id = workspace["id"]
        state.workspace_name = workspace["name"]
        await emit("log", {"message": f"Workspace {ws_name} provisioned, waiting for agent..."})
        await coder.wait_ready(state.workspace_id)
        await emit("log", {"message": "Workspace ready."})

        # ── CLONING ─────────────────────────────────────────────────────────
        await transition(AgentPhase.CLONING)
        slug = re.sub(r"[^a-z0-9]", "-", state.task.lower()[:40])
        state.branch_name = f"agent/{slug}-{int(time.time())}"

        # Inject GitHub token into remote URL for push auth
        from backend.config import settings
        authed_url = re.sub(
            r"https://github.com/",
            f"https://{settings.github_token}@github.com/",
            state.repo_url,
        )

        rc, out, err = await coder_exec(
            state.workspace_name,
            f"git clone {authed_url} {REPO_PATH} 2>&1"
        )
        if rc != 0:
            raise RuntimeError(f"Clone failed: {err or out}")

        await coder_exec(
            state.workspace_name,
            f"cd {REPO_PATH} && git checkout -b {state.branch_name}"
        )
        await emit("log", {"message": f"Cloned repo, on branch {state.branch_name}"})

        # ── ANALYZING ───────────────────────────────────────────────────────
        await transition(AgentPhase.ANALYZING)
        context_summary = await build_context(state.workspace_name)
        await emit("context_ready", {"summary": context_summary[:800]})

        # ── PLANNING ────────────────────────────────────────────────────────
        state.plan = await generate_plan(state.task, context_summary)
        await emit("plan_generated", {
            "steps": [
                {"index": s.index, "title": s.title, "description": s.description,
                 "tool": s.tool, "args": s.args}
                for s in state.plan
            ]
        })

        # ── AWAITING_PLAN_APPROVAL ───────────────────────────────────────────
        if not state.autonomous:
            await transition(AgentPhase.AWAITING_PLAN_APPROVAL)
            approval = await _wait_for_approval(state.session_id, timeout=600)
            if approval.get("action") == "reject":
                await emit("cancelled", {"reason": approval.get("reason", "Plan rejected")})
                state.phase = AgentPhase.IDLE
                return
            if "steps" in approval:
                # Merge user edits (title/description) onto original plan steps (which have tool+args)
                edits = {s["index"]: s for s in approval["steps"]}
                for step in state.plan:
                    if step.index in edits:
                        step.title = edits[step.index].get("title", step.title)
                        step.description = edits[step.index].get("description", step.description)

        # ── EXECUTING ───────────────────────────────────────────────────────
        for step in state.plan:
            await transition(
                AgentPhase.EXECUTING,
                current_step=step.index,
                total_steps=len(state.plan),
                step_title=step.title,
            )
            step.start_time = datetime.utcnow()
            step.status = "running"
            output = await execute_step(step, state, emit)
            step.status = "done"
            step.output = output
            await emit("step_done", {"step": step.index, "output": output[:300]})

        # ── PUSHING ─────────────────────────────────────────────────────────
        await transition(AgentPhase.PUSHING)
        await coder_exec(
            state.workspace_name,
            f"cd {REPO_PATH} && git push origin {state.branch_name} 2>&1"
        )
        _, diff, _ = await coder_exec(
            state.workspace_name,
            f"cd {REPO_PATH} && git diff origin/HEAD...{state.branch_name} 2>/dev/null || git diff HEAD~1 2>/dev/null"
        )
        state.diff_summary = diff or "(no diff — stub run made no file changes)"
        await emit("diff_ready", {"branch": state.branch_name, "diff": state.diff_summary[:4000]})

        # ── AWAITING_PR_APPROVAL ─────────────────────────────────────────────
        if not state.autonomous:
            await transition(AgentPhase.AWAITING_PR_APPROVAL)
            pr_approval = await _wait_for_approval(state.session_id, timeout=600)
            if pr_approval.get("action") == "reject":
                await emit("cancelled", {"reason": "PR rejected"})
                state.phase = AgentPhase.IDLE
                return

        # ── CREATING_PR ──────────────────────────────────────────────────────
        await transition(AgentPhase.CREATING_PR)
        pr_url = await create_pr(
            repo_url=state.repo_url,
            branch=state.branch_name,
            task=state.task,
            diff=state.diff_summary,
        )
        state.pr_url = pr_url
        await transition(AgentPhase.DONE, pr_url=pr_url)

    except Exception as e:
        import traceback
        traceback.print_exc()
        state.phase = AgentPhase.ERROR
        state.error = str(e)
        await emit("error", {"message": str(e)})

    finally:
        # Always delete the workspace when the agent finishes (DONE or ERROR)
        if state.workspace_id:
            try:
                coder = CoderClient()
                await coder.delete_workspace(state.workspace_id)
                await emit("log", {"message": f"Workspace {state.workspace_name} deleted."})
            except Exception:
                pass  # Best-effort cleanup, don't fail the session over this


async def _wait_for_approval(session_id: str, timeout: int) -> dict:
    loop = asyncio.get_event_loop()
    fut = loop.create_future()
    _approval_events[session_id] = fut
    try:
        return await asyncio.wait_for(asyncio.shield(fut), timeout=timeout)
    except asyncio.TimeoutError:
        return {"action": "reject", "reason": "Approval timed out"}
    finally:
        _approval_events.pop(session_id, None)


def resolve_approval(session_id: str, payload: dict):
    fut = _approval_events.get(session_id)
    if fut and not fut.done():
        fut.set_result(payload)
