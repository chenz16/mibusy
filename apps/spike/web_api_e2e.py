#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import uuid
from http.cookies import SimpleCookie
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import psycopg
from psycopg.rows import dict_row


DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/solo_agent",
)
WEB_BASE_URL = os.environ.get("WEB_BASE_URL", "http://127.0.0.1:3000")
VERCEL_AUTOMATION_BYPASS_SECRET = os.environ.get("VERCEL_AUTOMATION_BYPASS_SECRET")


def connect():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)


def reset_data() -> None:
    with connect() as conn:
        for table in [
            "session_events",
            "jobs",
            "billing_events",
            "schedules",
            "persona_facts",
            "topic_digests",
            "session_summaries",
            "inbox_items",
            "agent_sessions",
            "template_invocation_edges",
            "agent_templates",
            "invitations",
            "users",
            "tenants",
        ]:
            conn.execute(f"TRUNCATE {table} CASCADE")


def seed_invitation(code: str, email: str) -> None:
    tenant_id = str(uuid.uuid4())
    inviter_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute("INSERT INTO tenants(id, name) VALUES (%s, 'api-e2e-owner')", (tenant_id,))
        conn.execute(
            "INSERT INTO users(id, tenant_id, email, platform_role) VALUES (%s, %s, 'owner@example.com', 'admin')",
            (inviter_id, tenant_id),
        )
        conn.execute(
            """
            INSERT INTO invitations(code, invited_by_user_id, invitee_email, platform_role)
            VALUES (%s, %s, %s, 'friend')
            """,
            (code, inviter_id, email),
        )


def headers_to_dict(headers) -> dict[str, str | list[str]]:
    result: dict[str, str | list[str]] = dict(headers)
    cookies = headers.get_all("Set-Cookie", [])
    if cookies:
        result["Set-Cookie"] = cookies
    return result


def request_json(
    method: str,
    path: str,
    *,
    body: dict | None = None,
    cookie: str | None = None,
) -> tuple[int, dict, dict[str, str | list[str]]]:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json"}
    if VERCEL_AUTOMATION_BYPASS_SECRET:
        headers["x-vercel-protection-bypass"] = VERCEL_AUTOMATION_BYPASS_SECRET
    if body is not None:
        headers["Content-Type"] = "application/json"
    if cookie:
        headers["Cookie"] = cookie

    request = Request(f"{WEB_BASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode())
            return response.status, payload, headers_to_dict(response.headers)
    except HTTPError as error:
        payload = json.loads(error.read().decode())
        return error.code, payload, headers_to_dict(error.headers)


def header_values(headers: dict[str, str | list[str]], name: str) -> list[str]:
    value = headers.get(name)
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def pending_invite_cookie(headers: dict[str, str | list[str]]) -> str:
    raw_values = header_values(headers, "Set-Cookie")
    if not raw_values:
        raise AssertionError("invite endpoint did not set a cookie")
    cookie = SimpleCookie()
    for raw in raw_values:
        cookie.load(raw)
    if "pending_invite" not in cookie:
        raise AssertionError(f"pending_invite cookie missing from {raw_values!r}")
    value = cookie["pending_invite"].value
    return f"pending_invite={value}"


def main() -> None:
    reset_data()
    code = "api-e2e-invite"
    email = "api-user@example.com"
    user_id = str(uuid.uuid4())
    seed_invitation(code, email)

    invite_status, invite_payload, invite_headers = request_json("GET", f"/api/invite/{code}")
    checks: list[tuple[str, bool, str]] = [
        ("invite lookup status", invite_status == 200, str(invite_payload)),
        ("invite lookup body", invite_payload.get("ok") is True, str(invite_payload)),
    ]
    cookie = pending_invite_cookie(invite_headers)

    bootstrap_status, bootstrap_payload, bootstrap_headers = request_json(
        "POST",
        "/api/auth/bootstrap",
        body={"email": email, "userId": user_id},
        cookie=cookie,
    )
    checks.extend(
        [
            ("bootstrap status", bootstrap_status == 200, str(bootstrap_payload)),
            ("bootstrap body", bootstrap_payload.get("ok") is True, str(bootstrap_payload)),
            (
                "bootstrap clears cookie",
                any("Max-Age=0" in value for value in header_values(bootstrap_headers, "Set-Cookie")),
                str(bootstrap_headers),
            ),
        ]
    )

    with connect() as conn:
        user = conn.execute(
            "SELECT email, role, platform_role FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()
        invite = conn.execute(
            "SELECT consumed_at, consumed_by_user_id FROM invitations WHERE code = %s",
            (code,),
        ).fetchone()
    checks.extend(
        [
            ("user persisted", user and user["email"] == email and user["role"] == "owner", str(user)),
            ("platform role persisted", user and user["platform_role"] == "friend", str(user)),
            ("invite consumed", invite and invite["consumed_at"] is not None and str(invite["consumed_by_user_id"]) == user_id, str(invite)),
        ]
    )

    print("\nWeb API invite/bootstrap E2E")
    failed = False
    for name, ok, detail in checks:
        failed = failed or not ok
        status = "PASS" if ok else "FAIL"
        print(f"- {status}: {name} ({detail})")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
