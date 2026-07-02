from backend.coder.ssh import coder_exec

REPO_PATH = "/home/coder/repo"


async def build_context(workspace_name: str) -> str:
    """
    Build a compact codebase summary to pass to the planner.
    Collects: file tree, README, key symbols, package config.
    """
    _, tree, _ = await coder_exec(
        workspace_name,
        f"cd {REPO_PATH} && git ls-files | head -200"
    )
    _, readme, _ = await coder_exec(
        workspace_name,
        f"cat {REPO_PATH}/README.md 2>/dev/null | head -80"
    )
    _, symbols, _ = await coder_exec(
        workspace_name,
        (
            f"cd {REPO_PATH} && grep -rn "
            f"--include='*.py' --include='*.ts' --include='*.tsx' --include='*.js' "
            f"-E '^(def |class |export function |export default |export const )' "
            f". 2>/dev/null | head -100"
        )
    )
    _, pkg, _ = await coder_exec(
        workspace_name,
        f"(cat {REPO_PATH}/pyproject.toml 2>/dev/null || cat {REPO_PATH}/package.json 2>/dev/null || echo '') | head -50"
    )
    _, structure, _ = await coder_exec(
        workspace_name,
        f"cd {REPO_PATH} && find . -type f -name '*.py' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' | grep -v node_modules | grep -v '.git' | head -60"
    )

    parts = []
    if tree.strip():
        parts.append(f"=== ALL FILES ===\n{tree.strip()}")
    if structure.strip():
        parts.append(f"=== SOURCE FILES ===\n{structure.strip()}")
    if readme.strip():
        parts.append(f"=== README ===\n{readme.strip()}")
    if symbols.strip():
        parts.append(f"=== KEY SYMBOLS ===\n{symbols.strip()}")
    if pkg.strip():
        parts.append(f"=== PACKAGE CONFIG ===\n{pkg.strip()}")

    return "\n\n".join(parts) if parts else "Empty repository."
