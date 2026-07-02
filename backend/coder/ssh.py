import asyncio
from typing import Tuple


async def coder_exec(workspace_name: str, command: str, timeout: int = 300) -> Tuple[int, str, str]:
    """
    Run a command inside a Coder workspace.
    Uses `ssh -T coder.<workspace>` (no PTY) for clean stdout/stderr capture.
    Requires `coder config-ssh --yes` to have been run once on the host.
    """
    ssh_host = f"coder.{workspace_name}"
    proc = await asyncio.create_subprocess_exec(
        "ssh", "-T",
        "-o", "StrictHostKeyChecking=no",
        "-o", "BatchMode=yes",
        ssh_host,
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        return 1, "", f"Command timed out after {timeout}s"
    return proc.returncode, stdout.decode(), stderr.decode()
