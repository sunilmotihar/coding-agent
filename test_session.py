"""
Quick end-to-end test of the agent state machine.
Runs in autonomous mode (no approval gates) against a small public repo.
"""
import asyncio
import json
import httpx
import websockets

API = "http://localhost:8000"
WS  = "ws://localhost:8000"

# Small public repo — safe to clone and branch off
TEST_REPO = "https://github.com/sunilmotihar/autonomous-agent-demo" 
TEST_TASK = "Add a hello.txt file with a greeting message"


async def main():
    # 1. Create session
    async with httpx.AsyncClient() as http:
        r = await http.post(f"{API}/api/sessions", json={
            "task": TEST_TASK,
            "repo_url": TEST_REPO,
            "autonomous": True,
        })
        data = r.json()
        session_id = data["session_id"]
        print(f"\n✓ Session created: {session_id}\n")

    # 2. Connect WebSocket and print all events
    uri = f"{WS}/ws/{session_id}"
    async with websockets.connect(uri) as ws:
        async for raw in ws:
            msg = json.loads(raw)
            event_type = msg["type"]
            payload    = msg["payload"]

            if event_type == "phase_change":
                print(f"\n▶ PHASE: {payload['phase']}")
            elif event_type == "log":
                print(f"  · {payload['message']}")
            elif event_type == "context_ready":
                print(f"  · Context built ({len(payload['summary'])} chars)")
            elif event_type == "plan_generated":
                print(f"  · Plan ({len(payload['steps'])} steps):")
                for s in payload["steps"]:
                    print(f"      [{s['index']}] {s['title']}")
            elif event_type == "step_done":
                print(f"  ✓ Step {payload['step']} done: {payload['output']}")
            elif event_type == "diff_ready":
                print(f"  · Diff ready on branch: {payload['branch']}")
            elif event_type == "error":
                print(f"\n✗ ERROR: {payload['message']}")
                break
            elif event_type == "cancelled":
                print(f"\n✗ CANCELLED: {payload['reason']}")
                break

            # Stop after DONE or ERROR
            if event_type == "phase_change" and payload["phase"] in ("DONE", "ERROR"):
                if payload["phase"] == "DONE":
                    print(f"\n✓ PR: {payload.get('pr_url', 'n/a')}")
                break

    print("\nDone.\n")


asyncio.run(main())
