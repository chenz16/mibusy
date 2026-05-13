from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from .config import WorkerConfig


@dataclass(frozen=True)
class DeepSeekResponse:
    text: str
    model: str | None
    request_id: str | None
    tokens: int | None


def _token_total(usage: dict[str, Any] | None) -> int | None:
    if not usage:
        return None
    total = usage.get("total_tokens")
    if isinstance(total, int):
        return total
    prompt = usage.get("prompt_tokens")
    completion = usage.get("completion_tokens")
    if isinstance(prompt, int) and isinstance(completion, int):
        return prompt + completion
    return None


def _extract_text(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        return ""

    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        return "\n".join(parts)
    return ""


def run_deepseek_completion(config: WorkerConfig, *, prompt: str) -> DeepSeekResponse:
    if not config.deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is required when AGENT_LLM_PROVIDER=deepseek")

    body = {
        "model": config.deepseek_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are one member of a CEO's virtual team. Be concise, action-oriented, "
                    "and call out assumptions, risks, and decisions needed from the CEO."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "temperature": 0.2,
    }

    request = urllib.request.Request(
        f"{config.deepseek_base_url}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {config.deepseek_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read().decode("utf-8")
            response_payload = json.loads(raw)
            request_id = response.headers.get("x-ds-trace-id") or response.headers.get("x-request-id")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"DeepSeek API error {exc.code}: {detail[:1000]}") from exc

    return DeepSeekResponse(
        text=_extract_text(response_payload),
        model=response_payload.get("model") if isinstance(response_payload.get("model"), str) else None,
        request_id=request_id,
        tokens=_token_total(response_payload.get("usage") if isinstance(response_payload.get("usage"), dict) else None),
    )
