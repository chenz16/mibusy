"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InboxActions({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  async function update(status: "completed" | "cancelled") {
    const key = status === "completed" ? "approve" : "reject";
    setLoading(key);
    try {
      const res = await fetch(`/api/v2/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDone(status === "completed" ? "approved" : "rejected");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  if (done) {
    return (
      <div className="muted" style={{ fontSize: 13 }}>
        {done === "approved" ? "✓ 已批准" : "✗ 已拒绝"}
      </div>
    );
  }

  return (
    <footer className="toolbar">
      <button
        className="button"
        type="button"
        disabled={!!loading}
        onClick={() => update("completed")}
      >
        <Check size={15} />{loading === "approve" ? "处理中…" : "批准"}
      </button>
      <button
        className="button danger"
        type="button"
        disabled={!!loading}
        onClick={() => update("cancelled")}
      >
        <X size={15} />{loading === "reject" ? "处理中…" : "拒绝"}
      </button>
    </footer>
  );
}
