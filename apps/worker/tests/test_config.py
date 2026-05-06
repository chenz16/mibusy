from solo_agent_worker.config import allowed_tools_for_role


def test_friend_role_strips_dangerous_tools() -> None:
    assert allowed_tools_for_role("friend", ["Read", "Bash", "Edit", "Write", "WebFetch"]) == [
        "Read",
        "WebFetch",
    ]


def test_owner_role_can_use_requested_dangerous_tools() -> None:
    assert allowed_tools_for_role("owner", ["Read", "Bash", "Edit"]) == ["Read", "Bash", "Edit"]


def test_unknown_role_gets_friend_baseline() -> None:
    assert "Bash" not in allowed_tools_for_role("member", ["Read", "Bash"])

