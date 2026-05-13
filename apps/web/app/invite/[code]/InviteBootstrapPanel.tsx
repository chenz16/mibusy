"use client";

import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type InvitePayload = {
  ok: boolean;
  invite?: {
    email: string | null;
    platformRole: "admin" | "friend";
    expiresAt: string;
  };
  reason?: string;
  detail?: string;
};

type BootstrapPayload = {
  ok: boolean;
  tenantId?: string;
  userId?: string;
  platformRole?: "admin" | "friend";
  reason?: string;
  detail?: string;
};

function randomUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}`;
}

export function InviteBootstrapPanel({ code }: { code: string }) {
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [email, setEmail] = useState("");
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingInvite(true);
    fetch(`/api/invite/${encodeURIComponent(code)}`, { credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json()) as InvitePayload;
        if (!active) return;
        setInvite(payload);
        setEmail(payload.invite?.email ?? "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setInvite({ ok: false, reason: "request_failed", detail: error instanceof Error ? error.message : "unknown" });
      })
      .finally(() => {
        if (active) setLoadingInvite(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const expiresLabel = useMemo(() => {
    if (!invite?.invite?.expiresAt) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(invite.invite.expiresAt));
  }, [invite]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setBootstrap(null);
    try {
      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId: randomUserId() }),
      });
      setBootstrap((await response.json()) as BootstrapPayload);
    } catch (error) {
      setBootstrap({ ok: false, reason: "request_failed", detail: error instanceof Error ? error.message : "unknown" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInvite) {
    return (
      <section className="panel">
        <div className="panel-body stack">
          <span className="badge running"><Loader2 size={13} /> Checking invite</span>
        </div>
      </section>
    );
  }

  if (!invite?.ok || !invite.invite) {
    return (
      <section className="panel">
        <div className="panel-header"><span className="panel-title">Invite unavailable</span></div>
        <div className="panel-body stack">
          <span className="badge failed"><ShieldAlert size={13} /> {invite?.reason ?? "invalid_or_expired"}</span>
          {invite?.detail ? <p className="muted">{invite.detail}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="panel-title">Accept invite</span>
        <span className="badge">{invite.invite.platformRole}</span>
      </div>
      <form className="panel-body stack" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <div className="table compact">
          <div className="row">
            <span>Invite code</span>
            <strong>{code}</strong>
          </div>
          <div className="row">
            <span>Expires</span>
            <strong>{expiresLabel}</strong>
          </div>
        </div>
        <button className="button" disabled={submitting} type="submit">
          {submitting ? <Loader2 size={15} /> : null}
          Continue
        </button>
        {bootstrap ? (
          <div className={`callout ${bootstrap.ok ? "success" : "error"}`}>
            <span className="badge">
              {bootstrap.ok ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
              {bootstrap.ok ? "Bootstrap complete" : bootstrap.reason}
            </span>
            {bootstrap.ok ? (
              <p>Tenant {bootstrap.tenantId} created for {bootstrap.platformRole} access.</p>
            ) : (
              <p>{bootstrap.detail ?? "Invite could not be completed."}</p>
            )}
          </div>
        ) : null}
      </form>
    </section>
  );
}
