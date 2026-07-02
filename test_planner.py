"""Isolated planner test — runs without Coder or WebSocket."""
import asyncio
import traceback
from backend.agent.planner import generate_plan

FAKE_CONTEXT = """=== ALL FILES ===
README.md
hello_world.octocat

=== README ===
Hello World!
This is a hello-world repository for testing.
"""

async def main():
    print("Calling generate_plan...\n")
    try:
        plan = await generate_plan(
            task="Add a hello.txt file with a greeting message",
            context=FAKE_CONTEXT,
        )
        print(f"\n✓ Got {len(plan)} steps:")
        for s in plan:
            print(f"  [{s.index}] {s.title} — tool={s.tool}")
    except Exception:
        print("\n✗ Exception:")
        traceback.print_exc()

asyncio.run(main())
