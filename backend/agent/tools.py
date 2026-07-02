from backend.coder.ssh import coder_exec

REPO_PATH = "/home/coder/repo"

# Tool definitions passed to Claude's `tools=` parameter
TOOLS = [
    {
        "name": "shell_exec",
        "description": "Run a shell command in the Coder workspace (e.g. install deps, run tests, ls).",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to execute"}
            },
            "required": ["command"],
        },
    },
    {
        "name": "file_read",
        "description": "Read the full contents of a file in the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path relative to repo root"}
            },
            "required": ["path"],
        },
    },
    {
        "name": "file_write",
        "description": "Create or overwrite a file in the workspace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path relative to repo root"},
                "content": {"type": "string", "description": "Full file content to write"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "git_commit",
        "description": "Stage all changes and create a git commit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "Commit message"}
            },
            "required": ["message"],
        },
    },
    {
        "name": "git_diff",
        "description": "Return the unified diff of all uncommitted changes.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "list_files",
        "description": "List files tracked by git in a directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path (default: repo root)"}
            },
        },
    },
]


async def dispatch_tool(tool_name: str, tool_input: dict, workspace_name: str) -> str:
    """Execute a tool call and return its string result."""
    import shlex

    if tool_name == "shell_exec":
        rc, out, err = await coder_exec(
            workspace_name,
            f"cd {REPO_PATH} && {tool_input['command']}"
        )
        result = out or err
        return f"exit={rc}\n{result}"

    elif tool_name == "file_read":
        path = tool_input["path"].lstrip("/")
        rc, out, err = await coder_exec(
            workspace_name,
            f"cat {REPO_PATH}/{path}"
        )
        return out if rc == 0 else f"ERROR reading file: {err}"

    elif tool_name == "file_write":
        path = tool_input["path"].lstrip("/")
        content = tool_input["content"]
        escaped = shlex.quote(content)
        cmd = (
            f"mkdir -p $(dirname {REPO_PATH}/{path}) && "
            f"printf %s {escaped} > {REPO_PATH}/{path}"
        )
        rc, out, err = await coder_exec(workspace_name, cmd)
        return "ok" if rc == 0 else f"ERROR writing file: {err}"

    elif tool_name == "git_commit":
        message = shlex.quote(tool_input["message"])
        cmd = f"cd {REPO_PATH} && git config user.email 'agent@coder' && git config user.name 'Coding Agent' && git add -A && git commit -m {message}"
        rc, out, err = await coder_exec(workspace_name, cmd)
        return out if rc == 0 else f"ERROR: {err}"

    elif tool_name == "git_diff":
        rc, out, err = await coder_exec(
            workspace_name,
            f"cd {REPO_PATH} && git diff HEAD"
        )
        return out or "(no changes)"

    elif tool_name == "list_files":
        path = tool_input.get("path", ".")
        rc, out, err = await coder_exec(
            workspace_name,
            f"cd {REPO_PATH} && git ls-files {path} | head -200"
        )
        return out or "(empty)"

    raise ValueError(f"Unknown tool: {tool_name}")
