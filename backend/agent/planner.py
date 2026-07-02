import json
import re
import anthropic

from backend.config import settings
from backend.agent.state import PlanStep

SYSTEM_PROMPT = """You are a senior software engineer planning code changes.

Given a task and codebase context, produce a precise step-by-step implementation plan as a JSON array.

Each step must have this exact shape:
{{
  "index": <integer starting at 0>,
  "title": "<short title>",
  "description": "<what specifically to do>",
  "tool": "<one of: shell_exec | file_read | file_write | git_commit | git_diff | list_files>",
  "args": {{ <relevant args for the tool, e.g. {{"path": "src/app.py"}} or {{"command": "pytest"}} }}
}}

Rules:
- Be specific about file paths and exact code changes
- Always end with a git_commit step
- Maximum {max_steps} steps
- Output ONLY the JSON array, no prose before or after, no markdown code fences
"""


def _extract_json_array(text: str) -> list:
    """Robustly extract a JSON array from Claude's response."""
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text).strip()

    # Find outermost [ ... ]
    start = text.find("[")
    if start == -1:
        raise ValueError(f"No JSON array found in response:\n{text[:400]}")

    # Walk to find matching closing bracket
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                json_str = text[start : i + 1]
                # Remove trailing commas before } or ] — common Claude output quirk
                json_str = re.sub(r",\s*([}\]])", r"\1", json_str)
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    ctx_start = max(0, e.pos - 120)
                    ctx_end = min(len(json_str), e.pos + 120)
                    raise ValueError(
                        f"JSON parse failed: {e.msg} (char {e.pos})\n"
                        f"Context: ...{json_str[ctx_start:ctx_end]}..."
                    ) from e

    raise ValueError(f"Unmatched brackets in response:\n{text[:400]}")


async def generate_plan(task: str, context: str) -> list[PlanStep]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    resp = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT.format(max_steps=settings.max_plan_steps),
        messages=[
            {
                "role": "user",
                "content": f"TASK: {task}\n\nCODEBASE CONTEXT:\n{context}\n\nProduce the JSON plan.",
            }
        ],
    )

    raw = resp.content[0].text
    print(f"[planner] raw response:\n{raw}\n")  # debug — remove after confirming

    steps_data = _extract_json_array(raw)

    steps = []
    for s in steps_data:
        steps.append(PlanStep(
            index=int(s["index"]),
            title=str(s["title"]),
            description=str(s["description"]),
            tool=str(s["tool"]),
            args=s.get("args", {}),
        ))
    return steps
