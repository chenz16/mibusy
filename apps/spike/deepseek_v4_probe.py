from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/worker/src"))

from solo_agent_worker.config import WorkerConfig
from solo_agent_worker.deepseek_runner import run_deepseek_completion


def main() -> None:
    config = WorkerConfig(
        database_url=os.environ.get("DATABASE_URL", "postgresql://example"),
        worker_id="deepseek-probe",
        workspace_root=Path(os.environ.get("AGENT_WORKSPACE_ROOT", "/tmp/solo-agent-workspaces")),
        claude_home=Path(os.environ.get("CLAUDE_HOME", "/tmp/solo-agent-claude-home")),
        poll_interval_seconds=1,
        max_turns=1,
        llm_provider="deepseek",
        deepseek_api_key=os.environ.get("DEEPSEEK_API_KEY"),
        deepseek_base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/"),
        deepseek_model=os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro"),
    )
    response = run_deepseek_completion(
        config,
        prompt=(
            "Return a compact CEO-ready test response in this exact shape: "
            "status, model_identity, next_decision. Mention that this is a backend integration smoke test."
        ),
    )
    print(f"MODEL={response.model}")
    print(f"TOKENS={response.tokens}")
    print(f"REQUEST_ID={response.request_id or 'n/a'}")
    print("TEXT_START")
    print(response.text)
    print("TEXT_END")


if __name__ == "__main__":
    main()
