import { NextRequest } from "next/server";
import { Client } from "pg";

import type { SessionEventKind, SessionEventPayloadByKind } from "../../../../../lib/shared-types";

export const dynamic = "force-dynamic";

type SessionEventRow<K extends SessionEventKind = SessionEventKind> = {
  seq: number;
  kind: K;
  payload: SessionEventPayloadByKind[K];
  created_at: Date;
};

const databaseUrl = process.env.DATABASE_URL;

function encodeEvent(row: SessionEventRow) {
  return `id: ${row.seq}\nevent: ${row.kind}\ndata: ${JSON.stringify(row)}\n\n`;
}

async function fetchEvents(client: Client, sessionId: string, since: number) {
  const result = await client.query<SessionEventRow>(
    `
      SELECT seq, kind, payload, created_at
      FROM session_events
      WHERE session_id = $1 AND seq > $2
      ORDER BY seq ASC
    `,
    [sessionId, since],
  );
  return result.rows;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!databaseUrl) {
    return new Response("DATABASE_URL is not configured", { status: 500 });
  }

  const { id: sessionId } = await params;
  const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
  const useListenNotify = process.env.USE_LISTEN_NOTIFY === "true";
  const encoder = new TextEncoder();
  let lastSeq = Number.isFinite(since) ? since : 0;

  const stream = new ReadableStream({
    async start(controller) {
      const client = new Client({ connectionString: databaseUrl });
      let closed = false;

      const sendRows = async () => {
        const rows = await fetchEvents(client, sessionId, lastSeq);
        for (const row of rows) {
          lastSeq = row.seq;
          controller.enqueue(encoder.encode(encodeEvent(row)));
        }
      };

      const close = async () => {
        if (closed) return;
        closed = true;
        await client.end().catch(() => undefined);
        controller.close();
      };

      request.signal.addEventListener("abort", () => {
        void close();
      });

      await client.connect();
      await sendRows();

      if (useListenNotify) {
        const channel = `session_${sessionId.replaceAll("-", "_")}`;
        await client.query(`LISTEN ${channel}`);
        client.on("notification", () => {
          void sendRows();
        });
        setTimeout(() => void close(), 55_000);
      } else {
        const startedAt = Date.now();
        const poll = async () => {
          while (!closed && Date.now() - startedAt < 9_000) {
            await sendRows();
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
          await close();
        };
        void poll();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
