"use client";

import { useEffect, useMemo, useState } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function WebSocketDebugPanel() {
  const webSocketUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:3001/ws", []);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [latestMessage, setLatestMessage] = useState<string>("No message received yet.");

  useEffect(() => {
    const socket = new WebSocket(webSocketUrl);

    socket.addEventListener("open", () => {
      setStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      setLatestMessage(formatMessage(event.data));
    });

    socket.addEventListener("close", () => {
      setStatus("disconnected");
    });

    socket.addEventListener("error", () => {
      setStatus("error");
    });

    return () => {
      socket.close();
    };
  }, [webSocketUrl]);

  return (
    <section className="rounded border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-400">WebSocket proof</h2>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{webSocketUrl}</p>
        </div>
        <span className={getStatusClassName(status)}>{status}</span>
      </div>

      <pre className="mt-4 max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs leading-5 text-slate-300">
        {latestMessage}
      </pre>
    </section>
  );
}

function formatMessage(data: unknown): string {
  if (typeof data !== "string") {
    return String(data);
  }

  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}

function getStatusClassName(status: ConnectionStatus): string {
  const baseClassName = "rounded border px-3 py-1 text-xs font-medium uppercase tracking-normal";

  switch (status) {
    case "connected":
      return `${baseClassName} border-emerald-500/50 bg-emerald-500/10 text-emerald-300`;
    case "connecting":
      return `${baseClassName} border-sky-500/50 bg-sky-500/10 text-sky-300`;
    case "error":
      return `${baseClassName} border-red-500/50 bg-red-500/10 text-red-300`;
    case "disconnected":
      return `${baseClassName} border-slate-600 bg-slate-900 text-slate-300`;
  }
}
