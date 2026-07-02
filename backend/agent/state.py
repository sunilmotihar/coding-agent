from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, List
import uuid


class AgentPhase(str, Enum):
    IDLE                   = "IDLE"
    PROVISIONING_WORKSPACE = "PROVISIONING_WORKSPACE"
    CLONING                = "CLONING"
    ANALYZING              = "ANALYZING"
    AWAITING_PLAN_APPROVAL = "AWAITING_PLAN_APPROVAL"
    EXECUTING              = "EXECUTING"
    PUSHING                = "PUSHING"
    AWAITING_PR_APPROVAL   = "AWAITING_PR_APPROVAL"
    CREATING_PR            = "CREATING_PR"
    DONE                   = "DONE"
    ERROR                  = "ERROR"


@dataclass
class PlanStep:
    index: int
    title: str
    description: str
    tool: str
    args: dict
    status: str = "pending"
    output: Optional[str] = None


@dataclass
class AgentState:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    phase: AgentPhase = AgentPhase.IDLE
    task: str = ""
    repo_url: str = ""
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None
    branch_name: Optional[str] = None
    plan: List[PlanStep] = field(default_factory=list)
    current_step: int = 0
    diff_summary: Optional[str] = None
    pr_url: Optional[str] = None
    error: Optional[str] = None
    autonomous: bool = False
