import anthropic
from datetime import datetime

from backend.config import settings
from backend.agent.state import AgentState, PlanStep
from backend.agent.tools import TOOLS, dispatch_tool

SYSTEM_PROMPT = """You are an autonomous coding agent executing a single implementation step.

Use the available tools to complete the step described by the user.
Be precise with file paths. Read files before modifying them when needed.
When the step is complete, stop calling tools and confirm what you did in plain text.
Do not do more than what the step asks."""


async def execute_step(step: PlanStep, state: AgentState, emit) -> str:
    """
    Run a Claude tool-use loop to execute one plan step.
    Streams tool_call / tool_result events to the WebSocket as it works.
    Returns a text summary of what was done.
    """
    # Record timestamp when step execution begins
    step.started_at = datetime.utcnow()
    
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    messages = [
        {
            "role": "user",
            "content": (
                f"Execute this step:\n"
                f"Title: {step.title}\n"
                f"Description: {step.description}\n"
                f"Suggested tool: {step.tool}\n"
                f"Suggested args: {step.args}"
            ),
        }
    ]

    final_text = ""

    while True:
        resp = await client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        # Collect text for streaming
        for block in resp.content:
            if hasattr(block, "text") and block.text:
                final_text = block.text
                await emit("step_text", {"step": step.index, "text": block.text})

        if resp.stop_reason == "end_turn":
            break

        if resp.stop_reason == "tool_use":
            tool_results = []

            for block in resp.content:
                if block.type == "tool_use":
                    await emit("tool_call", {
                        "step": step.index,
                        "tool": block.name,
                        "input": block.input,
                    })

                    result = await dispatch_tool(
                        block.name,
                        block.input,
                        state.workspace_name,
                    )

                    # Truncate result for UI display only
                    await emit("tool_result", {
                        "step": step.index,
                        "tool": block.name,
                        "result": result[:500],
                    })

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,  # full result to Claude
                    })

            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": tool_results})

        else:
            # Unexpected stop reason
            break

    return final_text or f"Completed: {step.title}"
