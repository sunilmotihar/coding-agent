import re
import anthropic
from github import Github

from backend.config import settings


def _parse_owner_repo(repo_url: str) -> tuple[str, str]:
    m = re.search(r"github\.com[:/](.+?)/(.+?)(?:\.git)?$", repo_url)
    if not m:
        raise ValueError(f"Cannot parse GitHub owner/repo from URL: {repo_url}")
    return m.group(1), m.group(2)


async def create_pr(repo_url: str, branch: str, task: str, diff: str) -> str:
    owner, repo_name = _parse_owner_repo(repo_url)
    g = Github(settings.github_token)
    repo = g.get_repo(f"{owner}/{repo_name}")

    # Generate PR description with Claude
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    desc_resp = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Write a concise GitHub PR description (2-4 sentences + bullet points) for this task:\n"
                    f"Task: {task}\n\n"
                    f"Diff summary (first 1500 chars):\n{diff[:1500]}"
                ),
            }
        ],
    )
    body = desc_resp.content[0].text

    pr = repo.create_pull(
        title=f"[Agent] {task[:72]}",
        body=body,
        head=branch,
        base=repo.default_branch,
    )
    return pr.html_url
